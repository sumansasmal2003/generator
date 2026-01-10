// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { connectDB } from '@/lib/db';
import Photo, { IPhoto } from '@/models/Photo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Define Base URL
  const baseUrl = process.env.NEXT_PUBLIC_URL ||
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // 2. Fetch all photos from DB
  await connectDB();
  // Fetch only _id and createdAt to be efficient
  const photos = await Photo.find({}).select('_id createdAt').lean();

  // 3. Generate Dynamic Photo URLs
  const photoUrls = photos.map((photo) => ({
    url: `${baseUrl}/photo/${photo._id}`,
    lastModified: new Date(photo.createdAt || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // 4. Return combined sitemap (Static + Dynamic)
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...photoUrls,
  ];
}
