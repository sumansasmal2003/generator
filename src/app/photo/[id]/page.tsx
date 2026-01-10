// src/app/photo/[id]/page.tsx
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";
import Link from "next/link";
import { Metadata } from "next";
// Import the new Client Component
import PhotoDetails from "@/components/PhotoDetails";

// Define Props correctly for Next.js 15
interface Props {
  params: Promise<{ id: string }>;
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

// 1. DYNAMIC METADATA (SEO & Social Cards)
// ... (This part remains exactly the same as before) ...
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  await connectDB();
  const photo = await Photo.findById(id);

  if (!photo) {
    return { title: "Photo Not Found" };
  }

  // Construct Dynamic OG Image URL
  const ogUrl = new URL(`${getBaseUrl()}/api/og`);
  ogUrl.searchParams.set("title", photo.title);
  ogUrl.searchParams.set("prompt", photo.prompt);
  ogUrl.searchParams.set("imageUrl", photo.imageUrl);

  return {
    title: `${photo.title} | AI Generator`,
    description: `Generated with prompt: ${photo.prompt}`,
    openGraph: {
      title: photo.title,
      description: `AI Generated Art: ${photo.prompt}`,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: photo.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: photo.title,
      description: photo.prompt,
      images: [ogUrl.toString()],
    },
  };
}

// 2. THE PAGE UI (Server Component)
export default async function PhotoPage({ params }: Props) {
  // Await params first
  const { id } = await params;

  await connectDB();
  // Use lean() for plain JS object
  const photoLean = await Photo.findById(id).lean();

  if (!photoLean) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-500 mb-8">Photo not found</p>
          <Link href="/" className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  // Serialize the data for client component (convert ObjectId and Dates to strings)
  const photoData = {
      ...photoLean,
      _id: photoLean._id.toString(),
      createdAt: photoLean.createdAt.toISOString() // Ensure date is string for client prop
  };

  // Render the Client Component and pass data
  return <PhotoDetails photo={photoData} />;
}
