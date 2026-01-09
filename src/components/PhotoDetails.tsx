"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, Share2, Calendar, Tag, FileText, Check } from "lucide-react";
import cloudinaryLoader, { getWatermarkedUrl } from "@/lib/cloudinaryLoader";
import { IPhoto } from "@/models/Photo";

// Define the interface for the raw photo data coming from Mongoose lean()
interface PhotoData extends Omit<IPhoto, '_id'> {
    _id: string;
    createdAt: string | Date;
}

interface PhotoDetailsProps {
    photo: PhotoData;
}

export default function PhotoDetails({ photo }: PhotoDetailsProps) {
  // --- STATE ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- ZOOM STATE & REFS ---
  const [showZoom, setShowZoom] = useState(false);
  // Store cursor position as percentages (0-100) relative to the image container
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const sourceImageRef = useRef<HTMLDivElement>(null);

  // Zoom Level (e.g., 2.5 = 250%)
  const ZOOM_LEVEL = 2.5;

  // --- ZOOM HANDLERS ---
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    // 1. Disable on mobile/touch devices via feature detection just in case CSS fails
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (!sourceImageRef.current) return;

    // 2. Get dimensions of the source container
    const { left, top, width, height } = sourceImageRef.current.getBoundingClientRect();

    // 3. Calculate mouse position relative to the container
    const x = e.clientX - left;
    const y = e.clientY - top;

    // 4. Convert to percentage (0 to 100), ensuring bounds
    // We add a small buffer (e.g., 1% padding) to prevent jerkiness at edges
    let xPercent = (x / width) * 100;
    let yPercent = (y / height) * 100;

    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));

    setCursorPos({ x: xPercent, y: yPercent });
  };


  // --- ACTION HANDLERS (Download/Share preserved) ---
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // UPDATE: Wrap photo.imageUrl with getWatermarkedUrl()
      const watermarkedUrl = getWatermarkedUrl(photo.imageUrl);

      const response = await fetch(watermarkedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${photo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.title,
          text: `Check out this AI art: "${photo.prompt}"`,
          url: shareUrl,
        });
      } catch (err) { /* ignore cancel */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) { console.error("Failed to copy link", err); }
    }
  };

  const formattedDate = new Date(photo.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6 pointer-events-none">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full shadow-sm hover:bg-white transition-all text-sm font-medium text-gray-700"
        >
          <ArrowLeft size={16} /> Back to Gallery
        </Link>
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 container mx-auto px-4 pt-20 lg:pt-24 pb-8 flex flex-col lg:flex-row gap-6 lg:gap-12 relative">

        {/* --- LEFT: Source Image Container --- */}
        {/* Responsive heights:
            - Mobile: Fixed height (e.g., 50vh) to ensure details are visible below.
            - Desktop: Flex-1 to fill available space.
        */}
        <div
           ref={sourceImageRef}
           className="w-full lg:flex-1 h-[50vh] lg:h-auto bg-gray-50 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner cursor-crosshair"
           onMouseEnter={() => setShowZoom(true)}
           onMouseLeave={() => setShowZoom(false)}
           onMouseMove={handleMouseMove}
        >
           {/* Blurry Background placeholder */}
           <div
              className="absolute inset-0 z-0 opacity-50 pointer-events-none"
              style={{
                  backgroundImage: photo.blurDataUrl ? `url("${photo.blurDataUrl}")` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px)',
                  transform: 'scale(1.2)'
              }}
           />

           {/* Main Image displayed with 'contain' so the whole image is visible */}
           <div className="relative w-full h-full z-10 p-2 lg:p-8 pointer-events-none">
               <Image
                 loader={cloudinaryLoader}
                 src={photo.imageUrl}
                 alt={photo.title}
                 fill
                 // FIX 1: Ensure source is contain
                 className="object-contain drop-shadow-xl"
                 priority
                 sizes="(max-width: 1024px) 100vw, 60vw"
               />
           </div>
        </div>

        {/* --- RIGHT: Details Sidebar container --- */}
        {/* Relative position needed for the absolute zoom overlay */}
        <div className="w-full lg:w-[400px] xl:w-[450px] relative flex flex-col">

             {/* --- ZOOM WINDOW OVERLAY --- */}
             {/* FIX 2: 'hidden lg:block' completely removes this on mobile devices */}
             <div
                className={`hidden lg:block absolute inset-0 z-30 bg-gray-900 rounded-3xl border border-gray-200 shadow-2xl overflow-hidden pointer-events-none transition-opacity duration-200 ease-out ${showZoom ? 'opacity-100' : 'opacity-0'}`}
             >
                 {/* The container for the gigantic zoomed image */}
                 <div
                    className="relative"
                    style={{
                        width: `${ZOOM_LEVEL * 100}%`,
                        height: `${ZOOM_LEVEL * 100}%`,
                        // Standard negative translation zoom math
                        transform: `translate(-${cursorPos.x}%, -${cursorPos.y}%)`,
                        transformOrigin: 'top left'
                    }}
                 >
                     <Image
                        loader={cloudinaryLoader}
                        src={photo.imageUrl}
                        alt="Zoomed view"
                        fill
                        // FIX 3: CRITICAL CHANGE. Changed from 'cover' to 'contain'.
                        // This ensures the zoomed version has the exact same layout/padding
                        // as the original, making alignment perfect.
                        className="object-contain"
                        sizes="100vw"
                        quality={95} // Higher quality for zoom
                        priority
                     />
                 </div>
             </div>

            {/* Actual Sidebar Content */}
            <div className="flex flex-col gap-6 py-2 h-full">
                <div>
                    <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
                    {photo.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full">
                        AI Generated
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {formattedDate}
                    </span>
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    {/* Prompt Box */}
                    <div className="p-4 lg:p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3 text-gray-900 font-semibold">
                        <FileText size={18} />
                        <h3>Prompt</h3>
                    </div>
                    {/* Added max-height for mobile scrollability */}
                    <p className="text-gray-600 leading-relaxed font-mono text-sm max-h-[20vh] lg:max-h-[30vh] overflow-y-auto custom-scrollbar">
                        {photo.prompt || "No prompt details available."}
                    </p>
                    </div>

                    {/* Tags */}
                    {photo.tags && photo.tags.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-gray-900 font-semibold">
                        <Tag size={18} />
                        <h3>Tags</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {photo.tags.map((tag: string) => (
                            <span key={tag} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg">
                            #{tag}
                            </span>
                        ))}
                        </div>
                    </div>
                    )}
                </div>

                {/* Action Buttons (Sticky bottom on mobile via flex-col) */}
                <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white lg:static p-4 lg:p-0 mx-[-1rem] lg:mx-0">
                    <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-2 py-3 lg:py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-wait text-sm lg:text-base"
                    >
                    {isDownloading ? "Downloading..." : <><Download size={20} /> Download</>}
                    </button>

                    <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 py-3 lg:py-4 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition border border-gray-200 active:scale-95 text-sm lg:text-base"
                    >
                        {copiedLink ? (
                             <><Check size={20} className="text-green-600" /> Copied!</>
                        ) : (
                             <><Share2 size={20} /> Share</>
                        )}
                    </button>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
}
