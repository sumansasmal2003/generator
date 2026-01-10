"use client";

import { useState, useRef, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, Share2, Calendar, Tag, FileText, Check, X } from "lucide-react";
import cloudinaryLoader, { getWatermarkedUrl } from "@/lib/cloudinaryLoader";

interface PhotoData {
    _id: string;
    title: string;
    prompt: string;
    imageUrl: string;
    createdAt: string;
    blurDataUrl?: string;
    tags?: string[];
    width?: number;
    height?: number;
}

interface PhotoDetailsProps {
    photo: PhotoData;
}

export default function PhotoDetails({ photo }: PhotoDetailsProps) {
  // --- STATE ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Zoom & Lightbox
  const [showZoom, setShowZoom] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const sourceImageRef = useRef<HTMLDivElement>(null);
  const ZOOM_LEVEL = 2.5;

  // --- ZOOM HANDLERS ---
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;
    if (!sourceImageRef.current) return;

    const { left, top, width, height } = sourceImageRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    let xPercent = (x / width) * 100;
    let yPercent = (y / height) * 100;
    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));

    setCursorPos({ x: xPercent, y: yPercent });
  };

  // --- ACTION HANDLERS ---
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
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
    } catch (error) { console.error("Download failed", error); alert("Failed to download image."); }
    finally { setIsDownloading(false); }
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
      } catch (err) { /* ignore */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) { console.error(err); }
    }
  };

  const formattedDate = new Date(photo.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col transition-colors duration-300">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6 pointer-events-none">
        <Link href="/" className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-all text-sm font-medium text-gray-700 dark:text-gray-200">
          <ArrowLeft size={16} /> Back to Gallery
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pt-20 lg:pt-24 pb-8 flex flex-col lg:flex-row gap-6 lg:gap-12 relative">

        {/* --- LEFT: Source Image Container --- */}
        <div
           ref={sourceImageRef}
           className="w-full lg:flex-1 h-[50vh] lg:h-auto bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner cursor-zoom-in border border-gray-100 dark:border-gray-800 group"
           onMouseEnter={() => setShowZoom(true)}
           onMouseLeave={() => setShowZoom(false)}
           onMouseMove={handleMouseMove}
           onClick={() => setLightboxOpen(true)}
        >
           {/* Hint for Mobile */}
           <div className="absolute top-4 right-4 z-20 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity lg:hidden pointer-events-none">
             Tap to expand
           </div>

           {/* Background Blur */}
           <div className="absolute inset-0 z-0 opacity-50 pointer-events-none" style={{ backgroundImage: photo.blurDataUrl ? `url("${photo.blurDataUrl}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px)', transform: 'scale(1.2)' }} />

           {/* Main Image */}
           <div className="relative w-full h-full z-10 p-2 lg:p-8 pointer-events-none">
               <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-contain drop-shadow-xl" priority sizes="(max-width: 1024px) 100vw, 60vw" />
           </div>
        </div>

        {/* --- RIGHT: Details Sidebar --- */}
        <div className="w-full lg:w-[400px] xl:w-[450px] relative flex flex-col">
             {/* ZOOM OVERLAY (Desktop Only) */}
             <div className={`hidden lg:block absolute inset-0 z-30 bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden pointer-events-none transition-opacity duration-200 ease-out ${showZoom ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="relative" style={{ width: `${ZOOM_LEVEL * 100}%`, height: `${ZOOM_LEVEL * 100}%`, transform: `translate(-${cursorPos.x}%, -${cursorPos.y}%)`, transformOrigin: 'top left' }}>
                     <Image loader={cloudinaryLoader} src={photo.imageUrl} alt="Zoomed view" fill className="object-contain" sizes="100vw" quality={95} priority />
                 </div>
             </div>

            {/* Sidebar Content */}
            <div className="flex flex-col gap-6 py-2 h-full">
                <div>
                    <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">{photo.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold rounded-full">AI Generated</span>
                        <span className="flex items-center gap-1.5"><Calendar size={14} />{formattedDate}</span>
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    <div className="p-4 lg:p-5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-semibold">
                            <FileText size={18} /><h3>Prompt</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-mono text-sm max-h-[20vh] lg:max-h-[30vh] overflow-y-auto custom-scrollbar">{photo.prompt || "No prompt details available."}</p>
                    </div>

                    {photo.tags && photo.tags.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-semibold"><Tag size={18} /><h3>Tags</h3></div>
                        <div className="flex flex-wrap gap-2">
                            {photo.tags.map((tag: string) => (<span key={tag} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm rounded-lg">#{tag}</span>))}
                        </div>
                    </div>
                    )}
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-black lg:static p-4 lg:p-0 mx-[-1rem] lg:mx-0">
                    <button onClick={handleDownload} disabled={isDownloading} className="flex items-center justify-center gap-2 py-3 lg:py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-wait text-sm lg:text-base">
                        {isDownloading ? "Downloading..." : <><Download size={20} /> Download</>}
                    </button>
                    <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 lg:py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700 active:scale-95 text-sm lg:text-base">
                        {copiedLink ? <><Check size={20} className="text-green-600 dark:text-green-400" /> Copied!</> : <><Share2 size={20} /> Share</>}
                    </button>
                </div>
            </div>
        </div>
      </main>

      {/* NEW: Mobile Lightbox Overlay */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2" onClick={() => setLightboxOpen(false)}>
            <div className="relative w-full h-full max-w-4xl max-h-screen">
                <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-contain" />
            </div>
            <button className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition"><X size={24} /></button>
        </div>
      )}
    </div>
  );
}
