"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import {
  clearTokens,
  getRefreshToken,
  getToken,
  saveTokens,
} from "@/lib/session";
import { MAX_BODY_LENGTH } from "@/lib/types";

export type ActionResult = { error?: string };

// Every action re-reads the token: they're reachable by direct POST, so the
// API's own auth checks are what protect the data.
async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }
  return token;
}

async function failure(error: unknown): Promise<ActionResult> {
  if (error instanceof api.ApiError) {
    if (error.status === 401) {
      await clearTokens();
      return { error: "Your session has expired. Log in again." };
    }
    if (error.status === 403) {
      return { error: "You can only change your own posts and comments." };
    }
    if (error.status === 404) {
      return { error: "That no longer exists." };
    }
    // An assistant quota is used up. Nothing was created.
    if (error.status === 429) {
      return {
        error: `${error.message}. Try again later, or send it without the @mention.`,
      };
    }
    return { error: error.message };
  }
  console.error(error);
  return { error: "Couldn't reach the server. Try again." };
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// The API counts characters, not UTF-16 code units.
function bodyError(body: string, empty: string): string | undefined {
  if (!body) {
    return empty;
  }
  if ([...body].length > MAX_BODY_LENGTH) {
    return `Keep it to ${MAX_BODY_LENGTH.toLocaleString("en-US")} characters.`;
  }
}

// Only follow redirects back into this app.
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// Auth

export async function login(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  try {
    await saveTokens(await api.login(username, password));
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 401) {
      return { error: "Wrong username or password." };
    }
    return failure(error);
  }
  redirect(safeNext(text(formData, "next")));
}

export async function signup(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const username = text(formData, "username");
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  try {
    await api.createUser(username, email, password);
    await saveTokens(await api.login(username, password));
  } catch (error) {
    return failure(error);
  }
  redirect("/");
}

export type ResetRequestResult = ActionResult & { sentTo?: string };

export async function requestPasswordReset(
  _prev: ResetRequestResult,
  formData: FormData,
): Promise<ResetRequestResult> {
  const email = text(formData, "email");
  try {
    await api.requestPasswordReset(email);
  } catch (error) {
    return failure(error);
  }
  return { sentTo: email };
}

export async function resetPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const token = text(formData, "token");
  const password = String(formData.get("password") ?? "");
  if (!token) {
    return { error: "Paste the reset token from the email." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The passwords don't match." };
  }
  try {
    await api.resetPassword(token, password);
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 400) {
      return {
        error: "This reset link has expired or was already used. Ask for a new one.",
      };
    }
    return failure(error);
  }
  redirect("/login?reset=1");
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await api.logout(refreshToken);
    } catch (error) {
      // Log out here anyway; the refresh token expires on its own.
      console.error(error);
    }
  }
  await clearTokens();
  redirect("/");
}

// Posts

export async function createPost(formData: FormData): Promise<ActionResult> {
  const token = await requireToken();
  const body = text(formData, "body");
  const invalid = bodyError(body, "Write something first.");
  if (invalid) {
    return { error: invalid };
  }
  try {
    await api.createPost(token, body);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function updatePost(
  postId: number,
  formData: FormData,
): Promise<ActionResult> {
  const token = await requireToken();
  const body = text(formData, "body");
  const invalid = bodyError(body, "A post can't be empty.");
  if (invalid) {
    return { error: invalid };
  }
  try {
    await api.updatePost(token, postId, body);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function deletePost(
  postId: number,
  redirectTo?: string,
): Promise<ActionResult> {
  const token = await requireToken();
  try {
    await api.deletePost(token, postId);
  } catch (error) {
    return failure(error);
  }
  if (redirectTo) {
    redirect(safeNext(redirectTo));
  }
  refresh();
  return {};
}

// Comments

export async function createComment(
  postId: number,
  formData: FormData,
): Promise<ActionResult> {
  const token = await requireToken();
  const body = text(formData, "body");
  const invalid = bodyError(body, "Write something first.");
  if (invalid) {
    return { error: invalid };
  }
  try {
    await api.createComment(token, postId, body);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function updateComment(
  commentId: number,
  formData: FormData,
): Promise<ActionResult> {
  const token = await requireToken();
  const body = text(formData, "body");
  const invalid = bodyError(body, "A comment can't be empty.");
  if (invalid) {
    return { error: invalid };
  }
  try {
    await api.updateComment(token, commentId, body);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  const token = await requireToken();
  try {
    await api.deleteComment(token, commentId);
  } catch (error) {
    return failure(error);
  }
  refresh();
  return {};
}
