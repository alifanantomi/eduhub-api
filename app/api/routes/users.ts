import { Context } from 'hono'
import { authMiddleware } from '@/app/middleware/auth'
import { AppType } from '../types'

export function registerUserRoutes(app: AppType) {
  // GET user profile
  app.get('/users/profile', authMiddleware, async (c: Context) => {
    const user = c.get('user')
    
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    
    return c.json({ data: { user: userData } })
  })
  
  // PUT update user profile
  app.put('/users/profile', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    const { name, image } = await c.req.json()
    
    // Validate inputs
    if (!name) {
      return c.json({ error: 'Name is required' }, 400)
    }
    
    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          image
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      return c.json({ data: updatedUser })
    } catch (error) {
      return c.json({ error: 'Failed to update profile' }, 500)
    }
  })
  
  // GET user's last seen modules
  app.get('/users/last-seen', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    
    try {
      const lastSeenModules = await prisma.lastSeen.findMany({
        where: { userId: user.id },
        include: {
          module: {
            include: {
              topics: {
                include: {
                  topic: true
                }
              }
            }
          }
        },
        orderBy: {
          lastSeenAt: 'desc'
        }
      })
      
      return c.json({ data: { lastSeen: lastSeenModules } })
    } catch (error) {
      return c.json({ error: 'Failed to fetch last seen modules' }, 500)
    }
  })
  
  // POST update last seen
  app.post('/users/last-seen', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    const { moduleId } = await c.req.json()
    
    if (!moduleId) {
      return c.json({ error: 'Module ID is required' }, 400)
    }
    
    try {
      const lastSeen = await prisma.lastSeen.upsert({
        where: {
          userId_moduleId: {
            userId: user.id,
            moduleId
          }
        },
        update: {
          lastSeenAt: new Date()
        },
        create: {
          userId: user.id,
          moduleId,
          lastSeenAt: new Date()
        }
      })
      
      return c.json({ data: { lastSeen } }, 200)
    } catch (error) {
      return c.json({ error: 'Failed to update last seen' }, 500)
    }
  })
  
  return app
}