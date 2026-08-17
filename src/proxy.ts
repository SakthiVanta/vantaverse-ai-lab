import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.includes(pathname);
  const isApi = pathname.startsWith("/api/");
  const token = req.cookies.get("vv_admin_session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!isPublic && !session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (pathname === "/admin/login" && session) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
