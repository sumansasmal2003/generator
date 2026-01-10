import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // 1. Parse JSON instead of FormData (File is already on Cloudinary)
    const body = await req.json();
    const { title, prompt, tags: tagsInput, imageUrl, publicId, width, height, format } = body;

    if (!imageUrl || !publicId) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // 2. Process Tags
    const tags = tagsInput
      ? tagsInput.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0)
      : [];

    // 3. Generate Blur Placeholder
    // Fetch a tiny version (w=10) from Cloudinary to generate the blur hash efficiently
    const tinyUrl = imageUrl.replace("/upload/", "/upload/w_10/");
    const res = await fetch(tinyUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

    const blurBuffer = await sharp(buffer).toBuffer(); // Sharp converts to minimal buffer
    const blurDataUrl = `data:image/jpeg;base64,${blurBuffer.toString("base64")}`;

    // 4. Save to MongoDB
    const newPhoto = await Photo.create({
      title,
      prompt,
      tags,
      blurDataUrl,
      imageUrl,
      publicId,
      width,
      height,
      format,
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
