import { ponder } from "ponder:registry";
import type { Context, EventNames, IndexingFunctionArgs } from "ponder:registry";

export { ponder };

export type { EventNames, IndexingFunctionArgs };

export type Db = Context["db"];
