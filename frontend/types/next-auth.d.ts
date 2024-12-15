import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    backendToken?: string
    user: {
      id?: string
      email?: string
      name?: string
      image?: string
    }
  }

  interface User {
    backendToken?: string
    email?: string
    name?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string
  }
}