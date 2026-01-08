// src/app/api/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const ids = searchParams.get("ids") || "";

    const skip = (page - 1) * limit;
    let query: any = {};

    // 1. Filter by IDs (Favorites)
    if (ids) {
      const idArray = ids.split(",").filter((id) => id);
      query._id = { $in: idArray };
    }
    // 2. Filter by Tag
    else if (tag) {
      query.tags = tag;
    }
    // 3. Filter by Search Text
    else if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { prompt: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    let photos;
    let total;

    // --- LOGIC CHANGE: RANDOM MIX VS SORTED ---

    // Scenario A: User is browsing EVERYTHING (No Search, No Tag, No Favorites)
    // We use aggregate $sample to give a mix of old and new
    if (!search && !tag && !ids) {

      // Count total docs for pagination metadata
      total = await Photo.countDocuments({});

      photos = await Photo.aggregate([
        { $sample: { size: limit } }, // Randomly pick 'limit' items (Mix of old/new)
      ]);

      // Note: $sample doesn't strictly support consistent pagination (Page 2 might have repeats),
      // but it is perfect for an "Explore/Shuffle" feed experience.

    }
    // Scenario B: User is filtering (Search/Tags) -> Keep strict ordering
    else {
      total = await Photo.countDocuments(query);
      photos = await Photo.find(query)
        .sort({ createdAt: -1 }) // Newest first for search results
        .skip(skip)
        .limit(limit);
    }

    return NextResponse.json({
      data: photos,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
