import "server-only";
import type { Comment, Me, Post, User } from "./types";

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
  cookie?: string;
  json?: unknown;
  form?: Record<string, string>;
};

async function send(path: string, options: RequestOptions = {}): Promise<Response> {
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
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }
  return res;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
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
export const getMe = (token: string) => request<Me>("/users/me", { token });

// Auth

// The API hands out the refresh token as a cookie, meant for a browser. This
// server plays the browser: it takes the token out of Set-Cookie and sends it
// back in a Cookie header.
const REFRESH_COOKIE = "refresh_token";

export type Tokens = {
  accessToken: string;
  // Missing if the API didn't set the cookie.
  refreshToken?: string;
  // Seconds until the refresh token expires, from the cookie's Max-Age.
  refreshMaxAge?: number;
};

async function tokens(res: Response): Promise<Tokens> {
  const { access_token } = await res.json();
  const cookie = res.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
  const refreshToken = cookie?.split(";")[0].slice(REFRESH_COOKIE.length + 1);
  const maxAge = cookie?.match(/;\s*max-age=(\d+)/i)?.[1];
  return {
    accessToken: access_token,
    refreshToken: refreshToken || undefined,
    refreshMaxAge: maxAge ? Number(maxAge) : undefined,
  };
}

const refreshCookie = (refreshToken: string) =>
  `${REFRESH_COOKIE}=${refreshToken}`;

export const login = async (username: string, password: string) =>
  tokens(
    await send("/auth/token", {
      method: "POST",
      form: { grant_type: "password", username, password },
    }),
  );

// Each refresh token works once: this returns its replacement.
export const refresh = async (refreshToken: string) =>
  tokens(
    await send("/auth/refresh", {
      method: "POST",
      cookie: refreshCookie(refreshToken),
    }),
  );

export const logout = (refreshToken: string) =>
  request<void>("/auth/logout", {
    method: "POST",
    cookie: refreshCookie(refreshToken),
  });

export const createUser = (username: string, email: string, password: string) =>
  request<Me>("/users", { method: "POST", json: { username, email, password } });

// Answers the same whether or not an account uses the address.
export const requestPasswordReset = (email: string) =>
  request<void>("/auth/password-reset", { method: "POST", json: { email } });

export const resetPassword = (token: string, password: string) =>
  request<void>("/auth/password-reset/confirm", {
    method: "POST",
    json: { token, password },
  });

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
