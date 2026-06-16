import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { recoverMessageAddress } from "viem";
import { buildSelectionMessage } from "@ens-dis/domain";
import { getAppDb, wordSelections } from "../../db/app-tables.js";
import { normalizeAddress } from "../helpers.js";
import { WORD_POOL, validateSelection } from "../matchmaking/word-pool.js";

const ErrorSchema = z.object({ error: z.string() });

const AddressParam = z.object({
  address: z.string().openapi({
    param: { name: "address", in: "path" },
    example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  }),
});

const SelectionResponse = z.object({
  address: z.string().openapi({ example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
  words: z
    .array(z.string())
    .openapi({ example: ["security", "decentralization", "public_goods_funding", "transparency", "open_source"] }),
  updatedAt: z.number().openapi({ description: "Last-write Unix time in ms", example: 1781619462005 }),
});

const PoolWordSchema = z.object({
  id: z.string().openapi({ example: "decentralization" }),
  label: z.string().openapi({ example: "Decentralization" }),
});

const WordPoolResponse = z.object({
  pool: z.array(PoolWordSchema),
});

// GET /selections/word-pool — PUBLIC. The pool of value words the Selection
// modal renders. Static path, so it must out-rank /selections/{address}; Hono's
// router prioritizes static over param, and it's also registered first below.
const getWordPoolRoute = createRoute({
  method: "get",
  path: "/selections/word-pool",
  tags: ["Selections"],
  summary: "Get the matchmaking word pool",
  description:
    "Returns the canonical pool of value words (id + label) the Selection modal renders. Public.",
  responses: {
    200: {
      description: "The word pool",
      content: { "application/json": { schema: WordPoolResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const PutSelectionBody = z.object({
  address: z.string().openapi({ example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
  words: z
    .array(z.string())
    .openapi({ description: "Exactly 5 word ids from the pool (unordered set)" }),
  signature: z.string().openapi({
    description: "personal_sign signature over buildSelectionMessage(address, words)",
    example: "0x...",
  }),
});

// PUT /selections/me — the only write path. Authenticated by a wallet signature
// over a deterministic message binding the address to the exact word set.
const putRoute = createRoute({
  method: "put",
  path: "/selections/me",
  tags: ["Selections"],
  summary: "Upsert the caller's word selection",
  description:
    "Stores (or replaces) the signer's matchmaking word selection. The body must include a `personal_sign` signature over `buildSelectionMessage(address, words)`; the recovered signer must equal `address`. Idempotent upsert keyed by address.",
  request: {
    body: {
      content: { "application/json": { schema: PutSelectionBody } },
    },
  },
  responses: {
    200: {
      description: "Stored selection",
      content: { "application/json": { schema: SelectionResponse } },
    },
    400: {
      description: "Invalid address or selection",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: {
      description: "Signature missing, malformed, or not from the claimed address",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

// GET /selections/{address} — PUBLIC, no auth. Returns any address's selection
// (no privacy: selections are public for everyone). A wallet reads its own
// selection the same way, by querying its own address.
const getRoute = createRoute({
  method: "get",
  path: "/selections/{address}",
  tags: ["Selections"],
  summary: "Get an address's word selection (public)",
  description:
    "Returns the stored word selection for any address. Public — selections are not private. 404 when the address has no selection.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "The address's selection",
      content: { "application/json": { schema: SelectionResponse } },
    },
    400: {
      description: "Invalid address",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "No selection for this address",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

const app = new OpenAPIHono();

app.openapi(putRoute, async (c) => {
  try {
    const { address: rawAddress, words, signature } = c.req.valid("json");

    const address = normalizeAddress(rawAddress);
    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    // Validate the selection shape/pool membership before any crypto work.
    const validationError = validateSelection(words);
    if (validationError) {
      return c.json({ error: `Invalid selection: ${validationError}` }, 400);
    }

    // The signature must authorize THIS address for THESE exact words.
    const message = buildSelectionMessage(address, words);
    let recovered: string;
    try {
      recovered = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      return c.json({ error: "Malformed signature" }, 401);
    }
    if (recovered.toLowerCase() !== address) {
      return c.json({ error: "Signature does not match address" }, 401);
    }

    const now = BigInt(Date.now());
    const { db, ready } = getAppDb();
    await ready;
    await db
      .insert(wordSelections)
      .values({ address, words, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: wordSelections.address,
        set: { words, updatedAt: now },
      });

    return c.json({ address, words, updatedAt: Number(now) }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.openapi(getWordPoolRoute, (c) => {
  return c.json(
    { pool: WORD_POOL.map((w) => ({ id: w.id, label: w.label })) },
    200,
  );
});

app.openapi(getRoute, async (c) => {
  try {
    const { address: rawAddress } = c.req.valid("param");

    const address = normalizeAddress(rawAddress);
    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    const { db, ready } = getAppDb();
    await ready;
    const rows = await db
      .select()
      .from(wordSelections)
      .where(eq(wordSelections.address, address))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ error: "No selection for this address" }, 404);
    }

    const row = rows[0];
    return c.json(
      { address: row.address, words: row.words, updatedAt: Number(row.updatedAt) },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
