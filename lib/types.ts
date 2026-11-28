// Shapes returned by the ask-ai API (see openapi.json).

// The API keeps emails private: only `Me` carries one.
export type User = {
  id: number;
  username: string;
  created_at: string;
};

// The signed-in user, from sign-up and /users/me.
export type Me = User & {
  email: string;
};

// The longest post or comment the API accepts. The assistants' answers can be
// longer.
export const MAX_BODY_LENGTH = 10_000;

export type Post = {
  id: number;
  user_id: number;
  body: string;
  created_at: string;
};

export type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: string;
};

// What the UI needs to show an author.
export type Author = {
  id: number;
  username: string;
};
