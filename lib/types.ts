// Shapes returned by the ask-ai API (see openapi.json).

export type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
};

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

// What the UI needs to show an author. Emails stay on the server.
export type Author = {
  id: number;
  username: string;
};
