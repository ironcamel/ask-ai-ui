import "server-only";
import type { Comment, Post, User } from "./types";

// The API doesn't send CORS headers, so the browser never calls it directly:
// every request goes through Server Components and Server Actions.
const API_URL = (process.env.ASK_AI_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

// The API's largest page size.
const PAGE_SIZE = 100;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: string;
  token?: string;
  json?: unknown;
  form?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = new URLSearchParams(options.form);
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// FastAPI errors carry `detail`: a string, or a list of validation errors.
async function errorMessage(res: Response): Promise<string> {
  try {
    const { detail } = await res.json();
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string }) => d.msg?.replace(/^Value error, /, ""))
        .filter(Boolean)
        .join(". ");
    }
  } catch {
    // Not JSON; fall through.
  }
  return res.statusText || `Request failed (${res.status})`;
}

// List endpoints are paginated; follow the pages until a short one.
async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await request<T[]>(`${path}?offset=${offset}&limit=${PAGE_SIZE}`);
    items.push(...page);
    if (page.length < PAGE_SIZE) {
      return items;
    }
  }
}

// Reads

export const listPosts = () => listAll<Post>("/posts");
export const listComments = () => listAll<Comment>("/comments");
export const listUsers = () => listAll<User>("/users");
export const listPostComments = (postId: number) =>
  listAll<Comment>(`/posts/${postId}/comments`);
export const listUserPosts = (userId: number) =>
  listAll<Post>(`/users/${userId}/posts`);
export const listUserComments = (userId: number) =>
  listAll<Comment>(`/users/${userId}/comments`);

export const getPost = (postId: number) => request<Post>(`/posts/${postId}`);
export const getUser = (userId: number) => request<User>(`/users/${userId}`);
export const getMe = (token: string) => request<User>("/users/me", { token });

// Auth

export const login = (username: string, password: string) =>
  request<{ access_token: string }>("/auth/token", {
    method: "POST",
    form: { grant_type: "password", username, password },
  });

export const createUser = (username: string, email: string, password: string) =>
  request<User>("/users", { method: "POST", json: { username, email, password } });

// Writes

export const createPost = (token: string, body: string) =>
  request<Post>("/posts", { method: "POST", token, json: { body } });

export const updatePost = (token: string, postId: number, body: string) =>
  request<Post>(`/posts/${postId}`, { method: "PATCH", token, json: { body } });

export const deletePost = (token: string, postId: number) =>
  request<void>(`/posts/${postId}`, { method: "DELETE", token });

export const createComment = (token: string, postId: number, body: string) =>
  request<Comment>("/comments", {
    method: "POST",
    token,
    json: { post_id: postId, body },
  });

export const updateComment = (token: string, commentId: number, body: string) =>
  request<Comment>(`/comments/${commentId}`, {
    method: "PATCH",
    token,
    json: { body },
  });

export const deleteComment = (token: string, commentId: number) =>
  request<void>(`/comments/${commentId}`, { method: "DELETE", token });
