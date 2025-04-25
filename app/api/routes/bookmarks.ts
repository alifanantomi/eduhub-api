import { Context } from 'hono'
import { authMiddleware } from '@/app/middleware/auth'
import { AppType } from '../types'

export function registerBookmarkRoutes(app: AppType) {
  // GET user's bookmarks
  app.get('/bookmarks', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    
    try {
      const bookmarks = await prisma.bookmark.findMany({
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
        }
      })
      
      return c.json({ data: { bookmarks } })
    } catch (error) {
      return c.json({ error: 'Failed to fetch bookmarks' }, 500)
    }
  })
  
  // POST create a bookmark
  app.post('/bookmarks', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    const { moduleId } = await c.req.json()
    
    if (!moduleId) {
      return c.json({ error: 'Module ID is required' }, 400)
    }
    
    try {
      const bookmark = await prisma.bookmark.create({
        data: {
          userId: user.id,
          moduleId
        },
        include: {
          module: true
        }
      })
      
      return c.json({ data: { bookmark } }, 201)
    } catch (error) {
      return c.json({ error: 'Failed to create bookmark' }, 500)
    }
  })
  
  // DELETE remove a bookmark
  app.delete('/bookmarks/:moduleId', authMiddleware, async (c: Context) => {
    const prisma = c.get('prisma')
    const user = c.get('user')
    const moduleId = c.req.param('moduleId')
    
    try {
      await prisma.bookmark.delete({
        where: {
          userId_moduleId: {
            userId: user.id,
            moduleId
          }
        }
      })
      
      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: 'Failed to delete bookmark' }, 500)
    }
  })
  
  return app
}