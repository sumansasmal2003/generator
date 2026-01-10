// src/app/api/photos/related/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const tagsParam = searchParams.get("tags");

    if (!id) return NextResponse.json({ data: [] });

    // FIX: Explicitly type this array as any[] to satisfy TypeScript
    let related: any[] = [];

    // 1. Priority: Match Tags
    if (tagsParam) {
        const tags = tagsParam.split(",").filter(t => t);
        if (tags.length > 0) {
            related = await Photo.find({
                _id: { $ne: id },   // Exclude current photo
                tags: { $in: tags } // Match ANY of the tags
            })
            .limit(6)
            .sort({ createdAt: -1 });
        }
    }

    // 2. Fallback: If less than 4 related found, fill with recent uploads
    if (related.length < 4) {
        const excludeIds = [id, ...related.map(p => p._id)];
        const fallback = await Photo.find({ _id: { $nin: excludeIds } })
            .limit(6 - related.length)
            .sort({ createdAt: -1 });
        
        related = [...related, ...fallback];
    }

    return NextResponse.json({ data: related });

  } catch (error) {
    console.error("Related API Error:", error);
    return NextResponse.json({ error: "Failed to fetch related" }, { status: 500 });
  }
}
