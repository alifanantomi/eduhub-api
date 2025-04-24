import { Context, Hono, Next } from 'hono'
import { handle } from 'hono/vercel'
import { getPrisma } from '@/app/lib/prisma'
import { APIError } from 'better-auth/api'
import { auth } from '@/app/lib/auth'
import { Auth, Session, User } from 'better-auth'
import { cors } from 'hono/cors'
import { log } from 'console'

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

app.use('*', async (c, next) => {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    return c.json({ error: 'Database configuration missing' }, 500)
  }

  const prisma = getPrisma(process.env.DATABASE_URL || '')
  
  c.set('prisma', prisma)
  await next()
})

const authMiddleware = async (c: Context, next: Next) => {
  const prisma = c.get('prisma')

  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })

  if (!session) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  c.set('user', user)
  c.set('session', session)
  c.set('auth', auth)
  await next()
}

app.post('/auth/register', async (c) => {
  const { email, password, name } = await c.req.json()

  if (!email || !password || !name) {
    return c.json({ error: 'Email, password, and name are required'}, 400)
  }

  try {
   const { headers, response } = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      returnHeaders: true,
    })
    
    if (!headers || !response) {
      throw new Error("Error signing up user"); 
    }

    return c.json({ message: 'User registered successfully' }, 201)
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.body?.message }, 500)
    }

    return c.json({ error: error }, 500)
  }
})

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }
  try {
    const { headers, response } = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: c.req.raw.headers,
      returnHeaders: true,
    })

    if (!headers || !response) {
      throw new Error("Error signing in user");
    }
    
    return c.json({ message: 'User logged in successfully', data: { ...response } }, 200)
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.body?.message }, 500)
    }
    return c.json({ error: error }, 500)
  }
})

app.post('/auth/logout', authMiddleware, async (c) => {
  try {
    await auth.api.signOut(
      {
        headers: c.req.raw.headers,
      }
    )
    return c.json({ message: 'User logged out successfully' }, 200)
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.body?.message }, 500)
    }
    return c.json({ error: error }, 500)
  }
})

app.get('/auth/user', authMiddleware, async (c: Context) => {
  const user = c.get('user')
  const session = c.get('session')

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    session: {
      id: session.session.id,
      userId: session.session.userId,
      createdAt: session.session.createdAt,
      updatedAt: session.session.updatedAt,
      expiresAt: session.session.expiresAt,
    },
  }

  return c.json({ data: { userData }}, 200)
})

export const GET = handle(app)
export const POST = handle(app)
