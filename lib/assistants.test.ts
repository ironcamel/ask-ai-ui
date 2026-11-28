import { describe, expect, test } from "vitest";
import {
  findMention,
  pendingReplies,
  replaceMentions,
  splitMentions,
} from "./assistants";

describe("findMention", () => {
  test("finds the assistant asked a question", () => {
    expect(findMention("@claude what is a monad?")).toBe("claude");
    expect(findMention("What do you think, @gemini?")).toBe("gemini");
  });

  test("picks the first assistant mentioned", () => {
    expect(findMention("@gemini or @claude, which is faster?")).toBe("gemini");
  });

  test("ignores mentions that aren't standalone", () => {
    expect(findMention("@claudette what is a monad?")).toBeNull();
    expect(findMention("email bob@claude.com about it")).toBeNull();
  });

  test("needs a question besides the mentions", () => {
    expect(findMention("@claude")).toBeNull();
    expect(findMention("@claude @gemini!")).toBeNull();
  });

  test("returns null without a mention", () => {
    expect(findMention("what is a monad?")).toBeNull();
  });
});

test("splitMentions separates mentions from text", () => {
  expect(splitMentions("ask @claude, not bob@gemini.com")).toEqual([
    { text: "ask " },
    { text: "@claude", mention: "claude" },
    { text: ", not bob@gemini.com" },
  ]);
});

test("replaceMentions points every mention at one assistant", () => {
  expect(replaceMentions("@gemini hi, @claude? (bob@gemini.com)", "claude")).toBe(
    "@claude hi, @claude? (bob@gemini.com)",
  );
});

describe("pendingReplies", () => {
  test("is empty once every question is answered", () => {
    expect(
      pendingReplies([
        { body: "@claude why?", created_at: "t1", username: "alice" },
        { body: "Because.", created_at: "t2", username: "claude" },
      ]),
    ).toEqual([]);
  });

  test("matches each reply with the oldest open question", () => {
    expect(
      pendingReplies([
        { body: "@claude first?", created_at: "t1", username: "alice" },
        { body: "@claude second?", created_at: "t2", username: "bob" },
        { body: "@gemini third?", created_at: "t3", username: "bob" },
        { body: "First answer.", created_at: "t4", username: "claude" },
      ]),
    ).toEqual([
      { assistant: "claude", since: "t2" },
      { assistant: "gemini", since: "t3" },
    ]);
  });

  test("doesn't count mentions in an assistant's own replies", () => {
    expect(
      pendingReplies([
        { body: "@claude why?", created_at: "t1", username: "alice" },
        { body: "Ask @gemini about that.", created_at: "t2", username: "claude" },
      ]),
    ).toEqual([]);
  });
});
