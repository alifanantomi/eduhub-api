import { Context, Next } from 'hono'
import { auth } from '@/app/lib/auth'
import { UserRole } from '@prisma/client'

interface AuthOptions {
  requiredRole?: UserRole
}

export const authMiddleware = async (c: Context, next: Next) => {
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

  // Check role if options specify a required role
  if (c.get('requiredRole') && user.role !== c.get('requiredRole')) {
    return c.json({ error: 'Insufficient permissions' }, 403)
  }

  c.set('user', user)
  c.set('session', session)
  c.set('auth', auth)
  await next()
}

// Create role-based middleware factory
export const withRole = (role: UserRole) => {
  return async (c: Context, next: Next) => {
    c.set('requiredRole', role)
    return authMiddleware(c, next)
  }
}