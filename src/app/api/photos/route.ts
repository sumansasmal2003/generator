// src/app/api/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";
import { PipelineStage } from "mongoose"; // 1. Import PipelineStage type

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

    // --- 1. BUILD MATCH QUERY ---
    let matchStage: any = {};

    if (ids) {
      const idArray = ids.split(",").filter((id) => id);
      // @ts-ignore (ObjectId handling in aggregation)
      matchStage._id = { $in: idArray.map(id => new (require('mongoose').Types.ObjectId)(id)) };
    } 
    else if (tag) {
      matchStage.tags = tag;
    } 
    else if (search) {
      matchStage.$or = [
        { title: { $regex: search, $options: "i" } },
        { prompt: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // --- 2. DEFINE "PUSH TO BOTTOM" KEYWORDS ---
    const buriedKeywords = ["girl", "woman", "female", "lady", "bikini"];
    const regexPattern = buriedKeywords.join("|");

    // --- 3. AGGREGATION PIPELINE ---
    // FIX: Explicitly type the pipeline array
    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $addFields: {
          // Create a 'sortPriority' field
          sortPriority: {
            $cond: {
              if: {
                $or: [
                  { $regexMatch: { input: "$title", regex: regexPattern, options: "i" } },
                  { $regexMatch: { input: "$prompt", regex: regexPattern, options: "i" } },
                  // Check if ANY tag matches the pattern
                  { 
                    $gt: [
                      { 
                        $size: { 
                          $filter: { 
                            input: "$tags", 
                            as: "t", 
                            cond: { $regexMatch: { input: "$$t", regex: regexPattern, options: "i" } } 
                          } 
                        } 
                      }, 
                      0 
                    ] 
                  }
                ]
              },
              then: 2, // "Girl" images get priority 2 (LOWER)
              else: 1  // Normal images get priority 1 (HIGHER)
            }
          }
        }
      },
      // 4. Sort: FIX - Use 'as const' to satisfy literal types 1 and -1
      { $sort: { sortPriority: 1 as const, createdAt: -1 as const } }, 
      { $skip: skip },
      { $limit: limit }
    ];

    // Get Data
    const photos = await Photo.aggregate(pipeline);
    
    // Get Total Count (for pagination)
    const total = await Photo.countDocuments(matchStage);

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
