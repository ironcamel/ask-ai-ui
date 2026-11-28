import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import * as api from "./api";
import type { Author } from "./types";

export const ACCESS_COOKIE = "ask_ai_token";
export const REFRESH_COOKIE = "ask_ai_refresh_token";

// Refresh this long before the access token expires, so it doesn't run out
// partway through a request.
const REFRESH_MARGIN_SECONDS = 60;

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

// The API's access token is a JWT; its `exp` claim says when it stops working.
function expiresAt(token: string): number | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

// Whether a refresh is due: the access cookie expires with the token, so a
// missing one has run out.
export function needsRefresh(accessToken: string | undefined): boolean {
  if (!accessToken) {
    return true;
  }
  const exp = expiresAt(accessToken);
  return exp !== undefined && exp - Date.now() / 1000 < REFRESH_MARGIN_SECONDS;
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

type SessionCookie = typeof cookieOptions & {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
};

// The cookies that hold a login, in the form both `cookies().set` and
// `NextResponse.cookies.set` take.
export function sessionCookies(tokens: api.Tokens): SessionCookie[] {
  const exp = expiresAt(tokens.accessToken);
  const result: SessionCookie[] = [
    {
      name: ACCESS_COOKIE,
      value: tokens.accessToken,
      ...cookieOptions,
      ...(exp && { expires: new Date(exp * 1000) }),
    },
  ];
  if (tokens.refreshToken) {
    result.push({
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      ...cookieOptions,
      ...(tokens.refreshMaxAge !== undefined && { maxAge: tokens.refreshMaxAge }),
    });
  }
  return result;
}

// Only call from Server Actions, where cookies can be written.
export async function saveTokens(tokens: api.Tokens) {
  const jar = await cookies();
  for (const cookie of sessionCookies(tokens)) {
    jar.set(cookie);
  }
}

export async function clearTokens() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

// A page load sends several requests at once, all with the same refresh
// token, and more can follow before the browser has stored its replacement.
// A refresh token works once, and the API ends the login if one is used
// twice, so requests with the same token share one refresh. The result is
// kept for a minute for the stragglers. This only covers requests served by
// the same server process.
const SHARED_REFRESH_MS = 60_000;
const refreshes = new Map<string, Promise<api.Tokens>>();

export function refreshTokens(refreshToken: string): Promise<api.Tokens> {
  let refresh = refreshes.get(refreshToken);
  if (!refresh) {
    const forget = () => {
      if (refreshes.get(refreshToken) === refresh) {
        refreshes.delete(refreshToken);
      }
    };
    refresh = api.refresh(refreshToken);
    refreshes.set(refreshToken, refresh);
    // A failed refresh can be tried again right away.
    refresh.catch(forget);
    setTimeout(forget, SHARED_REFRESH_MS);
  }
  return refresh;
}

// The signed-in user, or null when there's no token or it has expired.
// Cached per request so the header and the page share one lookup.
export const getCurrentUser = cache(async (): Promise<Author | null> => {
  const token = await getToken();
  if (!token) {
    return null;
  }
  try {
    const { id, username } = await api.getMe(token);
    return { id, username };
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
});
