import {
  setClientConfig,
  type RelayDelegatePathParamsDaoEnumKey,
} from "@anticapture/client";

export const FRONTEND_CLIENT_SOURCE = "ens-dis-frontend";

setClientConfig({
  defaultHeaders: { "x-client-source": FRONTEND_CLIENT_SOURCE },
});

export const RELAYER_DAO_KEY: RelayDelegatePathParamsDaoEnumKey = "ens";

// Empty in dev/test (same-origin via vite dev proxy or MSW). Set to the
// backend's absolute origin in production so the SPA calls it cross-origin —
// backend CORS allowlist gates which frontends can reach the relayer proxy.
export const RELAYER_BASE_URL = (
  import.meta.env.VITE_RELAYER_BASE_URL ?? ""
).replace(/\/+$/, "");
