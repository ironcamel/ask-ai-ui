import "server-only";
import { notFound } from "next/navigation";
import * as api from "./api";
import { pendingReplies, type PendingReply } from "./assistants";
import type { Author, Comment, Post, User } from "./types";

export type CommentView = {
  id: number;
  body: string;
  createdAt: string;
  author: Author;
};

export type PostView = {
  id: number;
  body: string;
  createdAt: string;
  author: Author;
  comments: CommentView[];
  // Questions to an assistant that haven't been answered yet.
  pending: PendingReply[];
};

function authorLookup(users: User[]): (id: number) => Author {
  const byId = new Map(users.map((u) => [u.id, { id: u.id, username: u.username }]));
  return (id) => byId.get(id) ?? { id, username: "deleted user" };
}

function toThread(
  post: Post,
  comments: Comment[],
  author: (id: number) => Author,
): PostView {
  const views = comments
    .toSorted((a, b) => a.id - b.id)
    .map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      author: author(c.user_id),
    }));
  const postAuthor = author(post.user_id);
  return {
    id: post.id,
    body: post.body,
    createdAt: post.created_at,
    author: postAuthor,
    comments: views,
    pending: pendingReplies([
      { body: post.body, created_at: post.created_at, username: postAuthor.username },
      ...views.map((c) => ({
        body: c.body,
        created_at: c.createdAt,
        username: c.author.username,
      })),
    ]),
  };
}

function threads(posts: Post[], comments: Comment[], users: User[]): PostView[] {
  const author = authorLookup(users);
  const byPost = Map.groupBy(comments, (c) => c.post_id);
  return posts
    .toSorted((a, b) => b.id - a.id)
    .map((post) => toThread(post, byPost.get(post.id) ?? [], author));
}

/** Every post, newest first, with its comments. */
export async function getFeed(): Promise<PostView[]> {
  const [posts, comments, users] = await Promise.all([
    api.listPosts(),
    api.listComments(),
    api.listUsers(),
  ]);
  return threads(posts, comments, users);
}

function parseId(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) {
    notFound();
  }
  return n;
}

async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof api.ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function getThread(postId: string): Promise<PostView> {
  const id = parseId(postId);
  const [post, comments, users] = await Promise.all([
    orNotFound(api.getPost(id)),
    orNotFound(api.listPostComments(id)),
    api.listUsers(),
  ]);
  return toThread(post, comments, authorLookup(users));
}

export type Profile = {
  user: Author & { joinedAt: string };
  posts: PostView[];
  commentCount: number;
};

export async function getProfile(userId: string): Promise<Profile> {
  const id = parseId(userId);
  const [user, posts, comments, userComments, users] = await Promise.all([
    orNotFound(api.getUser(id)),
    api.listUserPosts(id),
    api.listComments(),
    api.listUserComments(id),
    api.listUsers(),
  ]);
  return {
    user: { id: user.id, username: user.username, joinedAt: user.created_at },
    posts: threads(posts, comments, users),
    commentCount: userComments.length,
  };
}
