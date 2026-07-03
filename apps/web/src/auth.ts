import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "@neondatabase/serverless"

// In apps/web/src/auth.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [Google],
  callbacks: {
    async session({ session, user }) {
      // Attach the user ID to the session object so we can query trackers later
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    }
  }
})