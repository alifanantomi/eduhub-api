import { Hono } from "hono"
import { getPrisma } from "@/app/lib/prisma"
import { Auth, Session, User } from "better-auth/*"

export type AppType = Hono<{
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    prisma: ReturnType<typeof getPrisma>
    auth: Auth
    user: User
    session: Session
    requiredRole?: string
  }
  Env: {
    DATABASE_URL: string
  }
}>