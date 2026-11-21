"use client";

import { useSyncExternalStore } from "react";

// One shared ticking clock for relative times and reply timeouts. The server
// render has no clock (null), so time-dependent UI fills in after hydration.

let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 5_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  now ??= Date.now();
  return now;
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
