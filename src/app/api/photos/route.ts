// src/app/api/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const ids = searchParams.get("ids") || ""; // <--- NEW PARAM

    const skip = (page - 1) * limit;
    const query: any = {};

    // Logic:
    // 1. If 'ids' are provided (Saved Tab), fetch ONLY those.
    // 2. Else, do normal search/tag filtering.
    if (ids) {
        const idList = ids.split(",").filter(id => id.length > 0);
        query._id = { $in: idList };
    } else if (tag) {
       query.tags = tag;
    } else if (search) {
       query.$or = [
          { title: { $regex: search, $options: "i" } },
          { prompt: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } }
       ];
    }

    const photos = await Photo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Photo.countDocuments(query);

    return NextResponse.json({
      data: photos,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
