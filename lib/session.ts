import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { ApiError, getMe } from "./api";
import type { Author } from "./types";

const COOKIE_NAME = "ask_ai_token";

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
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

// Only call from Server Actions, where cookies can be written.
export async function saveToken(token: string) {
  const exp = expiresAt(token);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(exp && { expires: new Date(exp * 1000) }),
  });
}

export async function clearToken() {
  (await cookies()).delete(COOKIE_NAME);
}

// The signed-in user, or null when there's no token or it has expired.
// Cached per request so the header and the page share one lookup.
export const getCurrentUser = cache(async (): Promise<Author | null> => {
  const token = await getToken();
  if (!token) {
    return null;
  }
  try {
    const { id, username } = await getMe(token);
    return { id, username };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
});
