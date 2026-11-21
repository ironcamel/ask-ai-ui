import Link from "next/link";
import {
  createComment,
  deleteComment,
  deletePost,
  updateComment,
  updatePost,
} from "@/app/actions";
import { isAssistant } from "@/lib/assistants";
import type { CommentView, PostView } from "@/lib/threads";
import type { Author } from "@/lib/types";
import { Avatar } from "./avatar";
import { MarkdownBody, PlainBody } from "./body";
import { Clamp } from "./clamp";
import { Composer } from "./composer";
import { Editable } from "./editable";
import { ThinkingIndicator } from "./pending-reply";
import { TimeAgo } from "./time-ago";

// How many of the latest comments a post shows in the feed.
const FEED_COMMENTS = 2;

function AuthorLine({
  author,
  createdAt,
  href,
}: {
  author: Author;
  createdAt: string;
  href?: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
      <Link href={`/users/${author.id}`} className="font-semibold hover:underline">
        {author.username}
      </Link>
      {isAssistant(author.username) && (
        <span className="rounded bg-hover px-1.5 py-px text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
          AI
        </span>
      )}
      <span className="text-muted">·</span>
      {href ? (
        <Link href={href} className="text-muted hover:underline">
          <TimeAgo iso={createdAt} />
        </Link>
      ) : (
        <span className="text-muted">
          <TimeAgo iso={createdAt} />
        </span>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUser,
  clamp,
}: {
  comment: CommentView;
  currentUser: Author | null;
  clamp: boolean;
}) {
  const fromAssistant = isAssistant(comment.author.username);
  const body = fromAssistant ? (
    <MarkdownBody body={comment.body} />
  ) : (
    <PlainBody body={comment.body} />
  );
  return (
    <li className="flex gap-3">
      <Avatar username={comment.author.username} size="sm" />
      <div
        className={`min-w-0 flex-1 rounded-2xl px-3.5 py-2.5 ${
          fromAssistant
            ? comment.author.username === "claude"
              ? "bg-claude/7 ring-1 ring-claude/15"
              : "bg-gemini/7 ring-1 ring-gemini/15"
            : "bg-subtle"
        }`}
      >
        <Editable
          kind="comment"
          body={comment.body}
          canEdit={currentUser?.id === comment.author.id}
          update={updateComment.bind(null, comment.id)}
          remove={deleteComment.bind(null, comment.id)}
          header={<AuthorLine author={comment.author} createdAt={comment.createdAt} />}
        >
          <div className="text-[0.9375rem]">{clamp ? <Clamp>{body}</Clamp> : body}</div>
        </Editable>
      </div>
    </li>
  );
}

export function PostCard({
  post,
  currentUser,
  full = false,
}: {
  post: PostView;
  currentUser: Author | null;
  // On its own page a post shows every comment, unabridged.
  full?: boolean;
}) {
  const href = `/posts/${post.id}`;
  const comments = full ? post.comments : post.comments.slice(-FEED_COMMENTS);
  const hidden = post.comments.length - comments.length;

  return (
    <article className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar username={post.author.username} />
        <div className="min-w-0 flex-1">
          <Editable
            kind="post"
            body={post.body}
            canEdit={currentUser?.id === post.author.id}
            update={updatePost.bind(null, post.id)}
            remove={deletePost.bind(null, post.id, full ? "/" : undefined)}
            header={
              <AuthorLine
                author={post.author}
                createdAt={post.createdAt}
                href={full ? undefined : href}
              />
            }
          >
            <div className={full ? "text-lg leading-relaxed" : "leading-relaxed"}>
              <PlainBody body={post.body} />
            </div>
          </Editable>
        </div>
      </div>

      {(post.comments.length > 0 || post.pending.length > 0 || currentUser) && (
        <section aria-label="Comments" className="mt-4 border-t border-line pt-4">
          {hidden > 0 && (
            <Link
              href={href}
              className="mb-3 inline-block text-sm font-medium text-muted hover:text-foreground hover:underline"
            >
              View all {post.comments.length} comments
            </Link>
          )}
          {comments.length > 0 && (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  clamp={!full}
                />
              ))}
            </ul>
          )}
          {post.pending.map((p) => (
            <div key={`${p.assistant}-${p.since}`} className="mt-3">
              <ThinkingIndicator assistant={p.assistant} since={p.since} />
            </div>
          ))}
          {currentUser && (
            <div className={comments.length > 0 || post.pending.length > 0 ? "mt-4" : ""}>
              <Composer
                action={createComment.bind(null, post.id)}
                placeholder="Write a comment…"
                submitLabel="Comment"
                minRows={1}
                compact
              />
            </div>
          )}
        </section>
      )}
    </article>
  );
}
