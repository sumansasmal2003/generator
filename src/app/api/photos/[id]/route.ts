// src/app/api/photos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";
import cloudinary from "@/lib/cloudinary";

export async function DELETE(
  req: NextRequest,
  // 1. Update the type definition: params is now a Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // 2. Await params before destructuring
    const { id } = await params;

    // 3. Find the photo first to get the Cloudinary Public ID
    const photo = await Photo.findById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // 4. Delete from Cloudinary
    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId);
    }

    // 5. Delete from MongoDB
    await Photo.findByIdAndDelete(id);

    return NextResponse.json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
