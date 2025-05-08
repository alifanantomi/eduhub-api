import { authMiddleware } from "@/app/middleware/auth";
import { AppType } from "../types";
import { v2 as cloudinary } from 'cloudinary';
import { createReadStream } from 'fs';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

const ensureTempDir = async () => {
  const tempDir = join(process.cwd(), 'tmp');
  try {
    await mkdir(tempDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
  return tempDir;
};

export function registerUploadRoutes(app: AppType) {
  app.post('/upload', authMiddleware, async (c) => {
    try {
      // Check if the request is multipart/form-data
      const contentType = c.req.header('content-type');
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return c.json({ error: 'Content-Type must be multipart/form-data' }, 400);
      }

      const user = c.get('user');
      if (!user || !user.id) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      // Get the form data using Next.js built-in FormData parser
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return c.json({ error: 'No file uploaded' }, 400);
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return c.json({ error: 'File must be an image' }, 400);
      }

      // Save file to temp directory
      const tempDir = await ensureTempDir();
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const filePath = join(tempDir, `${randomUUID()}-${file.name}`);
      await writeFile(filePath, fileBuffer);

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'profiles',
            public_id: `user_${user.id}`,
            overwrite: true
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        createReadStream(filePath).pipe(uploadStream);
      });

      // Return the URL
      return c.json({ 
        url: (result as any).secure_url,
        success: true
      });

    } catch (error) {
      console.error('Upload error:', error);
      return c.json({ error: 'File upload failed', details: (error as Error).message }, 500);
    }
  });

  return app
}