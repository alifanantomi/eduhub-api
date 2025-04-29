import { Context } from 'hono'
import { withRole } from '@/app/middleware/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { AppType } from '../types'
import { Topic } from '@prisma/client'

const topicSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export function registerTopicRoutes(app: AppType) {
  // GET all topics
  app.get('/topics', async (c: Context) => {
    const prisma = c.get('prisma')
    
    try {
      const topics = await prisma.topic.findMany({
        include: {
          description: false
        }
      })
      
      return c.json({ data: topics })
    } catch (error) {
      return c.json({ error: 'Failed to fetch topics' }, 500)
    }
  })
  
  // GET a single topic by ID
  app.get('/topics/:id', async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    
    try {
      const topic = await prisma.topic.findUnique({
        where: { id },
        include: {
          modules: {
            include: {
              module: true
            }
          }
        }
      })
      
      if (!topic) {
        return c.json({ error: 'Topic not found' }, 404)
      }
      
      return c.json({ data: topic })
    } catch (error) {
      return c.json({ error: 'Failed to fetch topic' }, 500)
    }
  })
  
  // POST create a new topic (admin only)
  app.post('/topics', withRole('ADMIN'), zValidator('json', topicSchema), async (c: Context) => {
    const prisma = c.get('prisma')
    const { name, description } = await c.req.json()
    
    try {
      const topic = await prisma.topic.create({
        data: {
          name,
          description,
        }
      })
      
      return c.json({ data: topic }, 201)
    } catch (error) {
      return c.json({ error: 'Failed to create topic' }, 500)
    }
  })
  
  // PUT update a topic (admin only)
  app.put('/topics/:id', withRole('ADMIN'), zValidator('json', topicSchema), async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    const { name, description } = await c.req.json()
    
    try {
      const topic = await prisma.topic.update({
        where: { id },
        data: {
          name,
          description,
        }
      })
      
      return c.json({ data: { topic } })
    } catch (error) {
      return c.json({ error: 'Failed to update topic' }, 500)
    }
  })
  
  // DELETE a topic (admin only)
  app.delete('/topics/:id', withRole('ADMIN'), async (c: Context) => {
    const prisma = c.get('prisma')
    const id = c.req.param('id')
    
    try {
      await prisma.topic.delete({
        where: { id }
      })
      
      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: 'Failed to delete topic' }, 500)
    }
  })
  
  return app
}