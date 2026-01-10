import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Signature must match the parameters we send from the frontend
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: "generator_app", // Must match the folder in UploadForm
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({ timestamp, signature });
}
