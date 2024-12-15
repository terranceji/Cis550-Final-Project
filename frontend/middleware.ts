import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    console.log("Middleware checking auth...");
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log("Checking authorization, token:", token);
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/profile",
    // Add other protected routes here
  ],
};