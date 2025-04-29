import { Context } from 'hono'
import { withRole } from '@/app/middleware/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { AppType } from '../types'

// Module validation schema
const moduleSchema = z.object({
  title: z.string().min(1),
  image: z.string().optional(),
  summary: z.string().min(1),
  content: z.string().min(1),
  topicIds: z.array(z.string().uuid()).optional(),
})

export function registerModuleRoutes(app: AppType) {
  // GET all modules
  app.get('/modules', async (c: Context) => {
    const prisma = c.get('prisma')
    
    try {
      const modules = await prisma.module.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          createdById: false,
          content: false
        }
      })
      
      return c.json({ data: modules })
    } catch (error) {
      return c.json({ error: 'Failed to fetch modules' }, 500)
    }
  })
  
  // GET a single module by ID
  app.get('/modules/:id', async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    
    try {
      const module = await prisma.module.findUnique({
        where: { id },
        include: {
          topics: {
            include: {
              topic: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!module) {
        return c.json({ error: 'Module not found' }, 404)
      }
      
      return c.json({ data: module })
    } catch (error) {
      return c.json({ error: 'Failed to fetch module' }, 500)
    }
  })
  
  // POST create a new module (admin only)
  app.post('/modules', withRole('ADMIN'), zValidator('json', moduleSchema), async (c) => {
    console.log('Raw request body:', await c.req.text());

    const prisma = c.get('prisma')
    const user = c.get('user')
    
    const { title, image, summary, content, topicIds } = await c.req.json()
    
    try {
      const module = await prisma.module.create({
        data: {
          title,
          image,
          summary,
          content,
          createdById: user.id,
          topics: topicIds ? {
            create: topicIds.map((topicId: any) => ({
              topic: {
                connect: { id: topicId }
              }
            }))
          } : undefined
        },
        include: {
          topics: {
            include: {
              topic: true
            }
          }
        }
      })
      
      return c.json({ data: module }, 201)
    } catch (error) {
      console.log("Failed to create module:", error);
      
      return c.json({ error: 'Failed to create module' }, 500)
    }
  })
  
  // PUT update a module (admin only)
  app.put('/modules/:id', withRole('ADMIN'), zValidator('json', moduleSchema), async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    const { title, image, summary, content, topicIds } = await c.req.json()
    
    try {
      // First delete existing topic connections
      await prisma.moduleOnTopic.deleteMany({
        where: { moduleId: id }
      })
      
      // Update the module with new data
      const module = await prisma.module.update({
        where: { id },
        data: {
          title,
          image,
          summary,
          content,
          topics: topicIds ? {
            create: topicIds.map((topicId: any) => ({
              topic: {
                connect: { id: topicId }
              }
            }))
          } : undefined
        },
        include: {
          topics: {
            include: {
              topic: true
            }
          }
        }
      })
      
      return c.json({ data: { module } })
    } catch (error) {
      return c.json({ error: 'Failed to update module' }, 500)
    }
  })
  
  // DELETE a module (admin only)
  app.delete('/modules/:id', withRole('ADMIN'), async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    
    try {
      await prisma.module.delete({
        where: { id }
      })
      
      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: 'Failed to delete module' }, 500)
    }
  })
  
  return app
}