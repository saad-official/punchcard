// Thin Better Auth client for the optional account (spec section 7). The session cookie lives
// in SecureStore via the Expo plugin; `authedFetch` reuses it for the app's own API routes
// (/api/devices, /api/sync/*).
import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { API_URL } from '@/constants/app';

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'punchcard',
      storagePrefix: 'punchcard',
      storage: SecureStore,
    }),
  ],
});

/** `{ data: { user, session } | null, isPending, error, refetch }`. */
export const useSession = authClient.useSession;

/** fetch() against the Punchcard API with the signed-in session cookie. */
export async function authedFetch(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<Response> {
  const cookie = await authClient.getCookie();
  return fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : null),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: 'omit',
    signal: init.signal,
  });
}
