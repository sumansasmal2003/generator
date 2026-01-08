// src/components/UploadForm.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, Image as ImageIcon, Sparkles, Trash2, FileText, Tag } from "lucide-react";
import { compressImage } from "@/lib/compress"; // Import the compression utility

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); // New state for feedback

  // Form Inputs
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState("");

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) return;

    setIsCompressing(true); // Start spinner/feedback if you want
    try {
        // 1. Generate Preview immediately for better UX
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);

        // 2. Compress the file in background
        const compressed = await compressImage(selectedFile);
        setFile(compressed);

        // Debug log to see savings
        console.log(`Original: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Compressed: ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);

        setStatus("idle");
        setUploadProgress(0);
    } catch (error) {
        console.error("Compression failed", error);
        // Fallback to original if compression fails
        setFile(selectedFile);
    } finally {
        setIsCompressing(false);
    }
  };

  const uploadFileWithProgress = (formData: FormData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/photos/upload");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("prompt", prompt);
    formData.append("tags", tags);

    try {
      await uploadFileWithProgress(formData);
      setStatus("success");

      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setTitle("");
        setPrompt("");
        setTags("");
        setStatus("idle");
        setUploadProgress(0);
      }, 2000);

    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  // Drag and Drop handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
      <div className="flex flex-col lg:flex-row min-h-[600px]">

        {/* LEFT SIDE: Image Dropzone */}
        <div className="w-full lg:w-5/12 bg-gray-50 p-8 flex flex-col justify-center relative border-b lg:border-b-0 lg:border-r border-gray-100">
          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
                  ${isDragging ? "border-blue-500 bg-blue-50 scale-[0.98]" : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"}
                `}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => document.getElementById("hidden-input")?.click()}
              >
                <div className="p-4 rounded-full bg-white shadow-sm mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-700 font-medium text-lg">Upload Image</p>
                <p className="text-gray-400 text-sm mt-1">Drag & drop or click</p>
                <input
                    id="hidden-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex items-center justify-center bg-gray-200 rounded-2xl overflow-hidden shadow-inner group"
              >
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />

                {isCompressing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <span className="text-white font-medium animate-pulse">Compressing...</span>
                    </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="bg-white text-red-500 p-3 rounded-full hover:bg-red-50 transition transform hover:scale-110 shadow-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDE: Form */}
        <div className="w-full lg:w-7/12 p-8 lg:p-12 flex flex-col">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              Generate Metadata <Sparkles className="text-yellow-500 w-6 h-6" />
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">

            {/* Title */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Artwork Title</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Neon Samurai"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

             {/* Tags Input */}
             <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Tags (Comma separated)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="e.g. cyberpunk, nature, blue"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-sm font-semibold text-gray-700 ml-1">AI Prompt</label>
                <div className="relative flex-1">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="The prompt used to generate this image..."
                        className="w-full h-full min-h-[120px] pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none"
                    />
                </div>
            </div>

            {/* Submit Button */}
            <div className="mt-4">
                {status === 'uploading' ? (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium text-gray-700">
                            <span>Uploading...</span><span>{uploadProgress}%</span>
                        </div>
                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-black rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : status === 'success' ? (
                     <motion.button disabled initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                        <Check size={20} /> Upload Complete!
                    </motion.button>
                ) : (
                    <button
                        type="submit"
                        disabled={!file || !title || isCompressing}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl ${!file || !title || isCompressing ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:bg-gray-800 hover:-translate-y-1"}`}
                    >
                        <Upload size={20} /> {isCompressing ? "Processing..." : "Publish"}
                    </button>
                )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
