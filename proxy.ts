import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  needsRefresh,
  refreshTokens,
  sessionCookies,
} from "@/lib/session";

// Server Components can't write cookies, so a new access token is fetched
// here, before the page or Server Action runs. Cookies set on this response
// reach the browser and also show up in `cookies()` for the same request.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || !needsRefresh(request.cookies.get(ACCESS_COOKIE)?.value)) {
    return response;
  }
  try {
    for (const cookie of sessionCookies(await refreshTokens(refreshToken))) {
      response.cookies.set(cookie);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // The login has ended: expired, logged out, or revoked.
      response.cookies.delete(REFRESH_COOKIE);
    } else {
      // Leave the cookies alone and try again on the next request.
      console.error(error);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
