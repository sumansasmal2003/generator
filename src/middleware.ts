import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Protect Admin Routes
  if (path.startsWith("/admin")) {
    const cookie = request.cookies.get("admin_session")?.value;
    const session = cookie ? await decrypt(cookie) : null;

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
  }

  // 2. Protect API Routes (Optional but Recommended)
  // If you want to block API calls from outside the dashboard, you can check here too.
  // For now, we will rely on the dashboard protection.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
