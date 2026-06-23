export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|confirm-password-change).*)"],
}
