import NextAuth from "next-auth";
import type { OIDCConfig } from "next-auth/providers";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      /** Our internal users.id — never the PocketID subject directly
       * (CLAUDE.md data model conventions). */
      id: string;
    } & DefaultSessionUser;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}

// Re-declared rather than imported from "next-auth" — DefaultSession's
// `user` shape isn't separately exported in a way that composes
// cleanly with the augmentation above.
interface DefaultSessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function pocketId(): OIDCConfig<Record<string, unknown>> {
  return {
    id: "pocketid",
    name: "PocketID",
    type: "oidc",
    issuer: process.env.POCKETID_ISSUER,
    clientId: process.env.POCKETID_CLIENT_ID,
    clientSecret: process.env.POCKETID_CLIENT_SECRET,
    // A custom OIDC provider config defaults to checks: ["pkce"] only
    // (Auth.js's built-in providers hardcode "state" themselves, but a
    // plain OIDCConfig object doesn't get that default — see
    // node_modules/@auth/core/lib/utils/providers.js). PocketID's
    // authorization server requires a `state` param with >= 8 chars of
    // entropy regardless of PKCE, and errors with invalid_state
    // without it. See MISTAKES.md.
    checks: ["pkce", "state"],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [pocketId()],
  // JWT, not database sessions — SPEC.md §8 has no sessions table, and
  // no Auth.js DB adapter is used here (see the callbacks below):
  // we maintain our own `users` table directly rather than adopting
  // Auth.js's generic adapter schema.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      // `profile` is only populated on the initial sign-in (the OIDC
      // ID token's claims), not on every subsequent JWT refresh.
      if (profile?.sub) {
        // Find-or-create, mirroring PocketID's subject id — "created
        // on first login, never self-registered" (CLAUDE.md). Every
        // other table keys off users.id, never the PocketID sub
        // directly, so that mapping lives only here.
        const existing = await db.query.users.findFirst({
          where: eq(users.pocketIdSub, profile.sub),
        });
        const user =
          existing ??
          (
            await db
              .insert(users)
              .values({
                pocketIdSub: profile.sub,
                email: typeof profile.email === "string" ? profile.email : null,
                name: typeof profile.name === "string" ? profile.name : null,
              })
              .returning()
          )[0];
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
