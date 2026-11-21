import Link from "next/link";
import { logout } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "./avatar";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav className="flex items-center gap-1 text-sm font-medium">
        <Link href="/login" className="rounded-full px-3 py-1.5 hover:bg-hover">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-3.5 py-1.5 text-accent-fg hover:opacity-90"
        >
          Sign up
        </Link>
      </nav>
    );
  }
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link
        href={`/users/${user.id}`}
        className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 font-medium hover:bg-hover"
      >
        <Avatar username={user.username} size="sm" />
        {user.username}
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-full px-3 py-1.5 font-medium text-muted hover:bg-hover hover:text-foreground"
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
