import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/constants";

// Cookieの有無だけの軽量チェック。トークンの検証は各ページ経由でバックエンドが行う
export function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
