// src/models/Photo.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPhoto extends Document {
  title: string;
  prompt: string;
  imageUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  tags: string[]; // Added tags array
  blurDataUrl: string;
  createdAt: Date;
}

const PhotoSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    prompt: { type: String, required: false },
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
    tags: { type: [String], default: [] }, // Added tags field
    blurDataUrl: { type: String },
  },
  { timestamps: true }
);

const Photo: Model<IPhoto> = mongoose.models.Photo || mongoose.model<IPhoto>("Photo", PhotoSchema);

export default Photo;
