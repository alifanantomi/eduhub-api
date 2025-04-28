import { Context } from 'hono'
import { APIError } from 'better-auth/api'
import { auth } from '@/app/lib/auth'
import { authMiddleware } from '@/app/middleware/auth'
import { AppType } from '../types'

export function registerAuthRoutes(app: AppType) {
  // POST register a new user
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

  // POST login user
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
      } else {
        const sessionToken = headers.get('set-auth-token')
        
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
        
        return c.json({ 
          message: 'User logged in successfully', 
          data: {
            ...response,
            role: user.role,
            token: sessionToken,
          }
        }, 200)
      }
    } catch (error) {
      if (error instanceof APIError) {
        return c.json({ error: error.body?.message }, 500)
      }
      return c.json({ error: error }, 500)
    }
  })

  // POST logout user
  app.post('/auth/logout', authMiddleware, async (c) => {
    try {
      await auth.api.signOut({
        headers: c.req.raw.headers,
      })
      return c.json({ message: 'User logged out successfully' }, 200)
    } catch (error) {
      if (error instanceof APIError) {
        return c.json({ error: error.body?.message }, 500)
      }
      return c.json({ error: error }, 500)
    }
  })

  // GET current user
  app.get('/auth/user', authMiddleware, async (c: Context) => {
    const user = c.get('user')
    const session = c.get('session')

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
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

  return app
}