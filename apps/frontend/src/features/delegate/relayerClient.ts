import {
  setClientConfig,
  type RelayDelegatePathParamsDaoEnumKey,
} from "@anticapture/client";

import { env } from "@/config/env";

export const FRONTEND_CLIENT_SOURCE = "ens-dis-frontend";

setClientConfig({
  defaultHeaders: { "x-client-source": FRONTEND_CLIENT_SOURCE },
});

export const RELAYER_DAO_KEY: RelayDelegatePathParamsDaoEnumKey = "ens";

// Same backend as the rest API. In dev `apiBaseUrl` is a relative path
// (`/api`) that the vite proxy rewrites — leave empty so the browser hits
// same-origin and the proxy catches `/api/gateful/*`. In prod it's the
// backend's absolute origin — use it directly as the relayer prefix.
export const RELAYER_BASE_URL = env.apiBaseUrl.startsWith("/")
  ? ""
  : env.apiBaseUrl;

// `@anticapture/client` defaults baseURL to "/api/gateful". When we override
// with an absolute origin we have to re-append the prefix, otherwise the
// generated client POSTs to `${origin}/ens/relay/delegate` — bypassing our
// proxy mount at `/api/gateful/*` and 404-ing.
export const RELAYER_CLIENT_BASE_URL = RELAYER_BASE_URL
  ? `${RELAYER_BASE_URL}/api/gateful`
  : undefined;
