"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Maximize2, Heart, Share2 } from "lucide-react";
import { IPhoto } from "@/models/Photo";
import cloudinaryLoader, { getWatermarkedUrl } from "@/lib/cloudinaryLoader";

interface PhotoCardProps {
  photo: IPhoto;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onView: (photo: IPhoto) => void;
}

export default function PhotoCard({ photo, index, isFavorite, onToggleFavorite, onView }: PhotoCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Context Menu State
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleImageLoad = () => { setIsLoading(false); setHasError(false); };

  const handleImageError = () => {
    setHasError(true);
    setTimeout(() => { setRetryKey((prev) => prev + 1); setHasError(false); }, 3000);
  };

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const watermarkedUrl = getWatermarkedUrl(photo.imageUrl);
      const response = await fetch(watermarkedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${photo.title.replace(/\s+/g, '_')}_watermarked.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) { console.error("Download failed", error); }
    setShowMenu(false);
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
        try {
            await navigator.share({
                title: photo.title,
                text: `Check out this AI art: "${photo.prompt}"`,
                url: window.location.href,
            });
        } catch (err) { console.log(err); }
    } else {
        await navigator.clipboard.writeText(photo.imageUrl);
        alert("Link copied!");
    }
    setShowMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuPos({ x: e.clientX, y: e.clientY });
      setShowMenu(true);
  };

  useEffect(() => {
      const handleClick = () => setShowMenu(false);
      window.addEventListener("click", handleClick);
      window.addEventListener("scroll", handleClick);
      return () => {
          window.removeEventListener("click", handleClick);
          window.removeEventListener("scroll", handleClick);
      };
  }, []);

  const safeId = photo._id as unknown as string;

  return (
    <>
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: (index % 5) * 0.1 }}
      className="relative mb-6 group rounded-2xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800 break-inside-avoid shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 will-change-transform"
      onClick={() => onView(photo)}
      onContextMenu={handleContextMenu}
    >
      {/* VIEW TRANSITION API (Shared Element)
        Wrapping Image + Blur in a layoutId container
      */}
      <motion.div layoutId={`image-container-${safeId}`} className="relative">
          {/* BLURRY BACKGROUND */}
          <div
            className="absolute inset-0 z-0 bg-gray-200 dark:bg-gray-800"
            style={{
                backgroundImage: photo.blurDataUrl ? `url("${photo.blurDataUrl}")` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(20px)',
                transform: 'scale(1.1)'
            }}
          />

          {/* MAIN IMAGE */}
          <Image
            key={retryKey}
            loader={cloudinaryLoader}
            src={photo.imageUrl}
            alt={photo.title}
            width={photo.width || 800}
            height={photo.height || 600}
            priority={index < 4}
            placeholder="empty"
            className={`relative z-10 w-full h-auto object-cover transition-opacity duration-700 ease-out ${
                isLoading || hasError ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
      </motion.div>

      {/* OVERLAYS (Title, Buttons) - These fade in/out, they don't morph */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }}
        className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 transition-colors group-hover:opacity-100 opacity-0 md:opacity-0"
        style={{ opacity: isFavorite ? 1 : undefined }}
      >
        <Heart size={18} className={`transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-white"}`} />
      </button>

      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
        <h3 className="text-white font-bold text-base sm:text-lg truncate drop-shadow-md transform translate-y-0 sm:translate-y-2 sm:group-hover:translate-y-0 transition-transform duration-300">
            {photo.title}
        </h3>

        <div className="hidden sm:flex justify-between items-center mt-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
            <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium bg-white/10 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
               Click to View
            </span>
            <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onView(photo); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition hover:scale-105">
                    <Maximize2 size={18} />
                </button>
                <button onClick={handleDownload} className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition shadow-lg hover:scale-105">
                    <Download size={18} />
                </button>
            </div>
        </div>
      </div>
    </motion.div>

    <AnimatePresence>
        {showMenu && (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, zIndex: 9999 }}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl p-1.5 min-w-[160px] flex flex-col gap-1 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={(e) => { onToggleFavorite(e); setShowMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <Heart size={16} className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"} />
                    {isFavorite ? "Remove" : "Favorite"}
                </button>
                <button onClick={handleShare} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <Share2 size={16} className="text-gray-500" />
                    Share
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 mx-1 my-0.5" />
                <button onClick={(e) => handleDownload(e)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <Download size={16} className="text-gray-500" />
                    Download
                </button>
            </motion.div>
        )}
    </AnimatePresence>
    </>
  );
}
