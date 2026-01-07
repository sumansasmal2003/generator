// src/app/api/tags/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Photo from "@/models/Photo";

export async function GET() {
  try {
    await connectDB();

    // Aggregate to count tags
    const tags = await Photo.aggregate([
      { $unwind: "$tags" }, // Deconstruct array
      { $group: { _id: "$tags", count: { $sum: 1 } } }, // Count occurrences
      { $sort: { count: -1 } }, // Sort by popularity
      { $limit: 20 } // Limit to top 20
    ]);

    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
