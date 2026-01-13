"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Sparkles, FileText, Tag, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { compressImage } from "@/lib/compress";
import { toast } from "sonner";

export default function UploadForm() {
  // --- STATE ---
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);

  // Form Inputs
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---
  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please upload a valid image file (JPG, PNG, WebP).");
        return;
    }

    // Preview immediately
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    setUploadStatus("idle");

    // Check size & Compress if needed (> 9.5MB)
    const SAFETY_THRESHOLD = 9.5 * 1024 * 1024;
    if (selectedFile.size > SAFETY_THRESHOLD) {
        setIsCompressing(true);
        const loadingToast = toast.loading("Optimizing large image...");
        try {
            const compressed = await compressImage(selectedFile);
            setFile(compressed);
            toast.success("Image optimized for web!", { id: loadingToast });
        } catch (error) {
            console.error(error);
            toast.error("Optimization failed, using original.", { id: loadingToast });
            setFile(selectedFile);
        } finally {
            setIsCompressing(false);
        }
    } else {
        setFile(selectedFile);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '').toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploadStatus("uploading");
    setProgress(0);
    const toastId = toast.loading("Starting upload...");

    try {
      // 1. Get Signature
      const signRes = await fetch("/api/sign-cloudinary", { method: "POST" });
      if (!signRes.ok) throw new Error("Auth failed");
      const { signature, timestamp } = await signRes.json();

      // 2. Upload to Cloudinary (XHR for progress)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "");
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", "generator_app");

      const cloudRes = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };

        xhr.onload = () => xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(xhr.responseText);
        xhr.onerror = () => reject("Network error");
        xhr.send(formData);
      });

      // 3. Save Metadata
      const saveRes = await fetch("/api/photos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          prompt,
          tags: tags.join(","),
          imageUrl: cloudRes.secure_url,
          publicId: cloudRes.public_id,
          width: cloudRes.width,
          height: cloudRes.height,
          format: cloudRes.format,
        }),
      });

      if (!saveRes.ok) throw new Error("Database error");

      // Success
      setUploadStatus("success");
      toast.success("Published successfully!", { id: toastId });

      // Reset after delay
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setTitle("");
        setPrompt("");
        setTags([]);
        setUploadStatus("idle");
        setProgress(0);
      }, 2500);

    } catch (error) {
      console.error(error);
      setUploadStatus("error");
      toast.error("Upload failed. Please try again.", { id: toastId });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row min-h-[700px]">

        {/* --- LEFT COLUMN: MEDIA UPLOAD --- */}
        <div className="w-full lg:w-5/12 bg-gray-50/80 p-8 lg:p-12 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 relative">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Media</h2>
            <p className="text-sm text-gray-500 mt-1">Upload your AI generated artwork.</p>
          </div>

          <div className="flex-1 flex flex-col relative">
            <AnimatePresence mode="wait">
              {!preview ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                  }}
                  className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
                    ${isDragging
                      ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-100/50"
                    }
                  `}
                >
                  <div className={`p-5 rounded-full mb-4 transition-transform duration-300 group-hover:scale-110 ${isDragging ? "bg-blue-100" : "bg-white shadow-sm"}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
                  </div>
                  <p className="text-gray-900 font-semibold text-lg">Click or drag image</p>
                  <p className="text-gray-400 text-sm mt-2 text-center max-w-[200px]">
                    Supports JPG, PNG, WebP up to 10MB
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative flex-1 rounded-3xl overflow-hidden bg-gray-900 group shadow-inner ring-1 ring-black/5"
                >
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                    <button
                      type="button"
                      onClick={() => document.getElementById("hidden-input")?.click()}
                      className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md transition-transform hover:scale-110"
                      title="Replace Image"
                    >
                      <Upload size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setPreview(null); }}
                      className="bg-red-500/80 hover:bg-red-600 text-white p-3 rounded-full backdrop-blur-md transition-transform hover:scale-110"
                      title="Remove Image"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* File Info Badge */}
                  {file && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-mono border border-white/10">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <input
                id="hidden-input"
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </div>
        </div>

        {/* --- RIGHT COLUMN: METADATA FORM --- */}
        <div className="w-full lg:w-7/12 p-8 lg:p-12 flex flex-col bg-white">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Details <Sparkles className="w-5 h-5 text-yellow-500" />
            </h2>
            <p className="text-sm text-gray-500 mt-1">Add context to help others discover this artwork.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">

            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Title</label>
              <div className="relative group">
                <ImageIcon className="absolute top-3.5 left-4 text-gray-400 group-focus-within:text-black transition-colors w-5 h-5" />
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neon Samurai"
                  className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 font-medium placeholder-gray-400 outline-none transition-all focus:ring-4 focus:ring-gray-100"
                />
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tags</label>
              <div
                onClick={() => document.getElementById("tag-input")?.focus()}
                className="min-h-[56px] w-full bg-gray-50 hover:bg-gray-100 focus-within:bg-white border border-transparent focus-within:border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 items-center transition-all focus-within:ring-4 focus-within:ring-gray-100 cursor-text"
              >
                <div className="pl-2 pr-1 text-gray-400"><Tag className="w-5 h-5" /></div>

                <AnimatePresence>
                  {tags.map(tag => (
                    <motion.span
                      key={tag}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 flex items-center gap-1.5 shadow-sm select-none"
                    >
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} strokeWidth={3} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>

                <input
                  id="tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInput}
                  placeholder={tags.length === 0 ? "Type tags..." : "Add more..."}
                  className="bg-transparent outline-none flex-1 min-w-[120px] text-gray-900 placeholder-gray-400 text-sm py-1"
                />
              </div>
              <p className="text-[11px] text-gray-400 ml-1">Press <b>Enter</b> or <b>Comma</b> to create a tag.</p>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Prompt</label>
              <div className="relative flex-1 group">
                <FileText className="absolute top-4 left-4 text-gray-400 group-focus-within:text-black transition-colors w-5 h-5" />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the prompt used to generate this image..."
                  className="w-full h-full min-h-[140px] bg-gray-50 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 leading-relaxed placeholder-gray-400 outline-none transition-all focus:ring-4 focus:ring-gray-100 resize-none"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-4 pt-6 border-t border-gray-100">
              {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                <button
                  type="submit"
                  disabled={!file || !title || isCompressing}
                  className="w-full group relative overflow-hidden bg-black text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isCompressing ? "Optimizing..." : "Publish Artwork"}
                        {!isCompressing && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </span>
                </button>
              ) : (
                <div className="w-full bg-gray-100 rounded-xl p-1 relative overflow-hidden h-[60px] flex items-center justify-center">
                    {/* Progress Bar Background */}
                    <motion.div
                        className={`absolute inset-0 ${uploadStatus === 'success' ? 'bg-green-500' : 'bg-black'}`}
                        initial={{ width: 0 }}
                        animate={{ width: uploadStatus === 'success' ? "100%" : `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Status Text */}
                    <div className="relative z-10 text-white font-bold flex items-center gap-2">
                        {uploadStatus === 'success' ? (
                            <><CheckCircle2 className="w-6 h-6" /> Upload Complete</>
                        ) : (
                            <><span className="loading-spinner w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {progress}% Uploaded</>
                        )}
                    </div>
                </div>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
