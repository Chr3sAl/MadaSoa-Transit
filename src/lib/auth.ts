import { redirect } from "next/navigation";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";

import { getAuthSecret } from "@/lib/runtime";
import type { Locale, Role } from "@/lib/types";
import { validateUserCredentials } from "@/lib/repository";
import { credentialsSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await validateUserCredentials(parsed.data.email, parsed.data.password);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role | undefined) ?? "operator";
      }

      return session;
    },
  },
};

export function isRoleAllowed(role: Role, allowedRoles?: Role[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(role);
}

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireSession(locale: Locale, allowedRoles?: Role[]) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect(`/${locale}/admin/login`);
  }

  if (!isRoleAllowed(session.user.role, allowedRoles)) {
    redirect(`/${locale}/admin/login?error=forbidden`);
  }

  return session;
}

export async function requireApiSession(allowedRoles?: Role[]) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isRoleAllowed(session.user.role, allowedRoles)) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    session,
  };
}
