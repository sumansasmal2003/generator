// src/app/api/photos/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";
import cloudinary from "@/lib/cloudinary";
import sharp from "sharp";

async function uploadToCloudinary(fileBuffer: Buffer, fileName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "generator_app", public_id: fileName, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(fileBuffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const prompt = formData.get("prompt") as string;
    const tagsInput = formData.get("tags") as string; // Get tags string

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    // Process Tags: "nature, blue sky " -> ["nature", "blue sky"]
    const tags = tagsInput
      ? tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blurBuffer = await sharp(buffer)
      .resize(10)
      .toBuffer();
    const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

    const safeName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + `_${Date.now()}`;
    const cloudResult = await uploadToCloudinary(buffer, safeName);

    const newPhoto = await Photo.create({
      title,
      prompt,
      tags, // Save processed tags
      blurDataUrl,
      imageUrl: cloudResult.secure_url,
      publicId: cloudResult.public_id,
      width: cloudResult.width,
      height: cloudResult.height,
      format: cloudResult.format,
    });

    return NextResponse.json({
      message: "Upload successful",
      data: newPhoto
    }, { status: 201 });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
