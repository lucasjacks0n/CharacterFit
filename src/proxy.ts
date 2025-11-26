import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      // For API routes, return 403 JSON
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Check if user has admin role in metadata
    if (sessionClaims?.metadata?.role !== "admin") {
      // For API routes, return 403 JSON
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
