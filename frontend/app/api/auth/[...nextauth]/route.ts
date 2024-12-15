import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as jose from 'jose';
import api from '@/utils/api';
import TwitterProvider from "next-auth/providers/twitter";

// Debug environment variables
console.log('Environment check:', {
  hasGoogleId: !!process.env.GOOGLE_ID,
  hasGoogleSecret: !!process.env.GOOGLE_SECRET,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
});

if (!process.env.GOOGLE_ID) {
  console.error('Missing GOOGLE_ID');
}
if (!process.env.GOOGLE_SECRET) {
  console.error('Missing GOOGLE_SECRET');
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0", // opt-in to Twitter OAuth 2.0
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        backendToken: { label: "Backend Token", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.backendToken) {
            throw new Error('No token provided');
          }

          // Parse the JWT using jose
          const decoded = jose.decodeJwt(credentials.backendToken);
          
          if (!decoded || !decoded.sub || !decoded.email) {
            throw new Error('Invalid token format');
          }

          return {
            id: decoded.sub as string,
            email: decoded.email as string,
            backendToken: credentials.backendToken
          };
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn Callback:', { user, account, profile });
      
      if (account?.provider === 'google' || account?.provider === 'twitter') {
        try {
          console.log('OAuth sign in, calling backend...');
          
          // Handle Twitter's different profile structure
          const email = account.provider === 'twitter' 
            ? `${profile.data.username}@twitter.user`
            : user.email;
          
          const name = account.provider === 'twitter'
            ? profile.data.name
            : user.name;
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/oauth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              name: name,
              provider: account.provider
            }),
          });

          const data = await response.json();
          console.log('Backend OAuth response:', data);

          if (data.token) {
            account.backendToken = data.token;
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error in OAuth sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      console.log('JWT Callback:', { token, user, account });
      
      // For OAuth sign in
      if (account?.backendToken) {
        console.log('Setting backend token from OAuth');
        token.backendToken = account.backendToken;
      }
      
      // For credentials sign in
      if (user?.backendToken) {
        console.log('Setting backend token from credentials');
        token.backendToken = user.backendToken;
      }
      
      console.log('Final JWT token:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback:', { session, token });
      
      if (token?.backendToken) {
        session.backendToken = token.backendToken;
      } else {
        console.error('No backend token in JWT token');
      }
      
      console.log('Final session:', session);
      return session;
    }
  },
  debug: true, // Enable NextAuth debug mode
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };