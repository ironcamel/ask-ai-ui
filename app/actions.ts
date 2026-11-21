"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as api from "@/lib/api";
import { clearToken, getToken, saveToken } from "@/lib/session";

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
      await clearToken();
      return { error: "Your session has expired. Log in again." };
    }
    if (error.status === 403) {
      return { error: "You can only change your own posts and comments." };
    }
    if (error.status === 404) {
      return { error: "That no longer exists." };
    }
    return { error: error.message };
  }
  console.error(error);
  return { error: "Couldn't reach the server. Try again." };
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
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
    const { access_token } = await api.login(username, password);
    await saveToken(access_token);
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
    const { access_token } = await api.login(username, password);
    await saveToken(access_token);
  } catch (error) {
    return failure(error);
  }
  redirect("/");
}

export async function logout() {
  await clearToken();
  redirect("/");
}

// Posts

export async function createPost(formData: FormData): Promise<ActionResult> {
  const token = await requireToken();
  const body = text(formData, "body");
  if (!body) {
    return { error: "Write something first." };
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
  if (!body) {
    return { error: "A post can't be empty." };
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
  if (!body) {
    return { error: "Write something first." };
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
  if (!body) {
    return { error: "A comment can't be empty." };
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
