import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySession } from "@/lib/jwt"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password"]
const AUTH_PATHS = ["/login", "/signup"]
const ADMIN_ONLY = ["/team", "/taxes", "/discounts"]
const CUSTOMER_PREFIX = "/portal"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySession(token)

  if (pathname.startsWith("/api")) return NextResponse.next()

  if (session && AUTH_PATHS.includes(pathname)) {
    const target = session.role === "CUSTOMER" ? "/portal" : "/dashboard"
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()

  if (!session) {
    const url = new URL("/login", request.url)
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith(CUSTOMER_PREFIX) && session.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!pathname.startsWith(CUSTOMER_PREFIX) && session.role === "CUSTOMER") {
    return NextResponse.redirect(new URL("/portal", request.url))
  }

  if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?denied=1", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|hero.jpg|auth.jpg).*)"]
}
