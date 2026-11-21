"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Cut long content short, with a button to show the rest. */
export function Clamp({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) {
      return;
    }
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={inner}
        className={
          open
            ? undefined
            : `max-h-56 overflow-hidden ${overflows ? "mask-b-from-60%" : ""}`
        }
      >
        {children}
      </div>
      {(overflows || open) && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-1 text-sm font-medium text-accent hover:underline"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
