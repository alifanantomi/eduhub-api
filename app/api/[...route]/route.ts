import { Context, Hono, Next } from 'hono'
import { handle } from 'hono/vercel'
import { getPrisma } from '@/app/lib/prisma'
import { Auth, Session, User } from 'better-auth'
import { registerAuthRoutes } from '../routes/auth'
import { registerModuleRoutes } from '../routes/modules'
import { registerTopicRoutes } from '../routes/topics'
import { registerBookmarkRoutes } from '../routes/bookmarks'
import { registerUserRoutes } from '../routes/users'

// Define your Hono app with the same types you already have
const app = new Hono<{
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    prisma: ReturnType<typeof getPrisma>
    auth: Auth
    user: User
    session: Session
  }
  Env: {
    DATABASE_URL: string
  }
}>().basePath('/api')

// Keep your database middleware
app.use('*', async (c, next) => {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    return c.json({ error: 'Database configuration missing' }, 500)
  }

  const prisma = getPrisma(process.env.DATABASE_URL || '')
  
  c.set('prisma', prisma)
  await next()
})

// Register all route modules
registerAuthRoutes(app)
registerModuleRoutes(app)
registerTopicRoutes(app)
registerBookmarkRoutes(app)
registerUserRoutes(app)

// Export the handlers for Next.js
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)