import { act, cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { TimeAgo } from "./time-ago";

// The shared clock keeps its time between tests, so the fake one runs for the
// whole file and each test measures from the current Date.now().
beforeAll(() => {
  vi.useFakeTimers({ now: new Date("2026-11-28T12:00:00Z") });
});
afterAll(() => {
  vi.useRealTimers();
});
afterEach(cleanup);

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

test("shows how long ago it was", () => {
  render(<TimeAgo iso={minutesAgo(5)} />);
  expect(screen.getByText("5 minutes ago")).toBeDefined();
});

test("says just now for the last few seconds", () => {
  render(<TimeAgo iso={minutesAgo(0.5)} />);
  expect(screen.getByText("just now")).toBeDefined();
});

test("stays current as time passes", () => {
  render(<TimeAgo iso={minutesAgo(5)} />);
  act(() => vi.advanceTimersByTime(60 * 60_000));
  expect(screen.getByText("1 hour ago")).toBeDefined();
});
