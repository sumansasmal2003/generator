// src/lib/cloudinaryLoader.ts
"use client";

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // If it's not a Cloudinary URL, return as is
  if (!src.includes("res.cloudinary.com")) return src;

  // Cloudinary allows us to insert transformations after "/upload/"
  // We add: f_auto (auto format), c_limit (resize but don't stretch), w_{width}, q_{quality}
  const params = [`f_auto`, `c_limit`, `w_${width}`, `q_${quality || 'auto'}`];

  const paramsString = params.join(",") + "/";

  // Insert params after "upload/"
  // Example Input: https://res.cloudinary.com/.../upload/v123/img.png
  // Example Output: https://res.cloudinary.com/.../upload/f_auto,c_limit,w_800,q_auto/v123/img.png
  return src.replace("/upload/", `/upload/${paramsString}`);
}
