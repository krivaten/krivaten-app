import { Context, MiddlewareHandler } from "hono"
import { jwtVerify } from "jose"
import type { Env, User, Variables } from "../types/env.d.ts"

export const authMiddleware: MiddlewareHandler<{
  Bindings: Env
  Variables: Variables
}> = async (c, next) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ detail: "Missing or invalid authorization header" }, 401)
  }

  const token = authHeader.substring(7)

  try {
    const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, {
      audience: "authenticated",
      algorithms: ["HS256"],
    })

    const userId = payload.sub
    if (!userId) {
      return c.json({ detail: "Invalid token payload" }, 401)
    }

    const user: User = {
      id: userId,
      email: (payload.email as string) ?? null,
      role: (payload.role as string) ?? null,
      metadata: (payload.user_metadata as Record<string, unknown>) ?? {},
    }

    c.set("user", user)
    await next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("expired")) {
        return c.json({ detail: "Token has expired" }, 401)
      }
      return c.json({ detail: `Invalid token: ${error.message}` }, 401)
    }
    return c.json({ detail: "Invalid token" }, 401)
  }
}

export function getUser(c: Context<{ Bindings: Env; Variables: Variables }>): User {
  return c.get("user")
}
