"use client";

import { useState, useEffect, useRef } from "react";
import { IPhoto } from "@/models/Photo";
import PhotoCard from "./PhotoCard";
import {
  X, Search, ChevronLeft, ChevronRight, Copy, Check, Share2, Heart, Download, Sparkles, Palette
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader";
import ColorThief from "colorthief";

interface ITag {
  _id: string;
  count: number;
}

export default function Gallery() {
  // --- STATE MANAGEMENT ---
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedPhoto, setSelectedPhoto] = useState<IPhoto | null>(null);

  // Related Photos State
  const [relatedPhotos, setRelatedPhotos] = useState<IPhoto[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Palette State
  const [palette, setPalette] = useState<string[]>([]);
  const [loadingPalette, setLoadingPalette] = useState(false);

  // UI Feedback State
  const [copied, setCopied] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number } | null>(null);

  // Filters & Search
  const [availableTags, setAvailableTags] = useState<ITag[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewFavorites, setViewFavorites] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- 1. INITIAL SETUP ---
  useEffect(() => {
    const saved = localStorage.getItem("generator_favorites");
    if (saved) {
        try { setFavorites(JSON.parse(saved)); } catch (e) { console.error(e); }
    }

    const fetchTags = async () => {
      try {
        const res = await fetch("/api/tags");
        if (res.ok) setAvailableTags(await res.json());
      } catch (e) { console.error("Failed to fetch tags"); }
    };
    fetchTags();

    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu);
    return () => {
        window.removeEventListener("click", closeMenu);
        window.removeEventListener("scroll", closeMenu);
    };
  }, []);

  // --- 2. SEARCH DEBOUNCE ---
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
        if (search) setViewFavorites(false);
        setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // --- 3. MAIN DATA FETCHING ---
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        let url = `/api/photos?page=${page}&limit=${ITEMS_PER_PAGE}`;

        if (viewFavorites) {
            if (favorites.length === 0) {
                setPhotos([]);
                setLoading(false);
                return;
            }
            url += `&ids=${favorites.join(",")}`;
        }
        else {
            if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
            else if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setPhotos(data.data);
        setTotalPages(data.meta.totalPages);

        if (page > 1 && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [page, debouncedSearch, selectedTag, viewFavorites]);

  // --- 4. FETCH RELATED & PALETTE ---
  useEffect(() => {
    if (!selectedPhoto) return;

    // A. Fetch Related
    const fetchRelated = async () => {
        setLoadingRelated(true);
        try {
            const tagsQuery = selectedPhoto.tags ? selectedPhoto.tags.join(",") : "";
            const id = selectedPhoto._id as unknown as string;

            const res = await fetch(`/api/photos/related?id=${id}&tags=${encodeURIComponent(tagsQuery)}`);
            const data = await res.json();
            setRelatedPhotos(data.data || []);
        } catch (error) {
            console.error("Failed to load related", error);
        } finally {
            setLoadingRelated(false);
        }
    };

    // B. Extract Palette
    const extractColors = async () => {
        setLoadingPalette(true);
        setPalette([]);
        try {
            const img = new window.Image();
            img.crossOrigin = "Anonymous";
            img.src = selectedPhoto.imageUrl;

            img.onload = () => {
                try {
                    const colorThief = new ColorThief();
                    const result = colorThief.getPalette(img, 5);
                    if (result) {
                        const hexColors = result.map((rgb: number[]) =>
                            `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`
                        );
                        setPalette(hexColors);
                    }
                } catch (e) {
                    console.error("Color extraction error", e);
                } finally {
                    setLoadingPalette(false);
                }
            };
            img.onerror = () => setLoadingPalette(false);
        } catch (error) {
            console.error("Failed to load image for palette", error);
            setLoadingPalette(false);
        }
    };

    fetchRelated();
    extractColors();
  }, [selectedPhoto]);

  // --- HANDLERS ---
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let newFavs;
    if (favorites.includes(id)) {
        newFavs = favorites.filter(fav => fav !== id);
        if (viewFavorites) {
            setPhotos(prev => prev.filter(p => (p._id as unknown as string) !== id));
        }
    } else {
        newFavs = [...favorites, id];
    }
    setFavorites(newFavs);
    localStorage.setItem("generator_favorites", JSON.stringify(newFavs));
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedTag("");
    setViewFavorites(false);
    setPage(1);
  };

  const handleDownload = async (photo: IPhoto) => {
    setIsDownloading(true);
    try {
      const response = await fetch(photo.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${photo.title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  const handleCopyColor = async (color: string) => {
    try {
        await navigator.clipboard.writeText(color);
        setCopiedColor(color);
        setTimeout(() => setCopiedColor(null), 2000);
    } catch (err) { console.error(err); }
  };

  const handleShare = async (photo: IPhoto) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.title,
          text: `Check out this AI art: "${photo.prompt}"`,
          url: window.location.href,
        });
      } catch (err) { console.log(err); }
    } else {
      try {
        await navigator.clipboard.writeText(photo.imageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert("Link copied to clipboard!");
      } catch (err) { console.error(err); }
    }
  };

  const handleModalContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="h-full relative flex flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pb-32">

        {/* HERO */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl mx-auto space-y-6"
            >
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                    Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Artificial</span>.
                </h2>
                <div className="relative group max-w-xl mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for 'cyberpunk', 'nature', 'abstract'..."
                        className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-base"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {(search || selectedTag || viewFavorites) && (
                        <button onClick={clearFilters} className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-8">
            <div className="flex flex-wrap justify-center gap-2">
                <button
                    onClick={() => {
                        setViewFavorites(!viewFavorites);
                        setSelectedTag("");
                        setSearch("");
                        setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border flex items-center gap-2
                        ${viewFavorites
                            ? "bg-red-500 text-white border-red-500 shadow-md transform scale-105"
                            : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500"}
                    `}
                >
                    <Heart size={14} className={viewFavorites ? "fill-white" : ""} />
                    Saved <span className="opacity-70 text-xs ml-1">{favorites.length}</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2 self-center hidden sm:block" />
                {availableTags.map((tag) => (
                    <button
                        key={tag._id}
                        onClick={() => {
                            if (selectedTag === tag._id) setSelectedTag("");
                            else {
                                setSelectedTag(tag._id);
                                setViewFavorites(false);
                                setSearch("");
                            }
                            setPage(1);
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border
                            ${selectedTag === tag._id
                                ? "bg-black text-white border-black shadow-md transform scale-105"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"}
                        `}
                    >
                        {tag._id}
                    </button>
                ))}
            </div>
        </div>

        {/* GRID */}
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
            {loading ? (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
                    {[...Array(10)].map((_, i) => {
                         const heights = [320, 450, 280, 380, 420, 260, 350, 300, 400, 290];
                         const height = heights[i % heights.length];
                         return <div key={i} className="w-full bg-gray-100 animate-pulse rounded-2xl break-inside-avoid mb-6" style={{ height: `${height}px` }} />;
                    })}
                </div>
            ) : (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
                    {photos.map((photo, index) => (
                    <div key={photo._id as unknown as string} className="break-inside-avoid">
                        <PhotoCard
                            photo={photo}
                            index={index}
                            onView={setSelectedPhoto}
                            isFavorite={favorites.includes(photo._id as unknown as string)}
                            onToggleFavorite={(e) => toggleFavorite(e, photo._id as unknown as string)}
                        />
                    </div>
                    ))}
                </div>
            )}
            {!loading && photos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <p className="text-lg font-medium">No results found.</p>
                </div>
            )}
        </div>
      </div>

      {/* PAGINATION */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 transition-transform hover:scale-105">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="p-2 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors">
                <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[80px] text-center">Page {page} <span className="text-gray-400 font-normal">/ {totalPages || 1}</span></span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="p-2 rounded-full hover:bg-black/5 disabled:opacity-30 transition-colors">
                <ChevronRight size={20} />
            </button>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {selectedPhoto && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="absolute top-4 right-4 z-50">
               <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors" onClick={() => setSelectedPhoto(null)}>
                 <X size={24} />
               </button>
            </div>
             <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-7xl w-full h-[85vh] lg:h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
               {/* 1. IMAGE SECTION */}
               <div
                 className="basis-[40%] min-h-[250px] lg:basis-3/4 bg-gray-100 flex items-center justify-center relative overflow-hidden cursor-context-menu flex-shrink-0"
                 onContextMenu={handleModalContextMenu}
               >
                 <div
                    className="absolute inset-0 z-0 opacity-50"
                    style={{
                        backgroundImage: selectedPhoto.blurDataUrl ? `url("${selectedPhoto.blurDataUrl}")` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(30px)',
                        transform: 'scale(1.2)'
                    }}
                 />
                 <div className="relative w-full h-full z-10 p-4 lg:p-12">
                    <Image
                        loader={cloudinaryLoader}
                        src={selectedPhoto.imageUrl}
                        alt={selectedPhoto.title}
                        fill
                        placeholder={selectedPhoto.blurDataUrl ? "blur" : "empty"}
                        blurDataURL={selectedPhoto.blurDataUrl}
                        className="object-contain drop-shadow-2xl"
                        sizes="(max-width: 768px) 100vw, 80vw"
                    />
                 </div>
               </div>

               {/* 2. DETAILS SECTION */}
               <div className="flex-1 lg:basis-1/4 p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col bg-white overflow-hidden">
                  <div className="flex-shrink-0">
                    <h2 className="text-xl lg:text-2xl font-bold mb-2 text-gray-900 leading-tight">{selectedPhoto.title}</h2>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase tracking-wide">AI Generated</span>
                        <span className="text-xs text-gray-400">{new Date(selectedPhoto.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">

                     {/* --- COLOR PALETTE SECTION --- */}
                     {(loadingPalette || palette.length > 0) && (
                        <div className="mb-6">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Palette size={12} /> Color Palette
                             </h4>

                             {loadingPalette ? (
                                /* Skeleton Loader for Palette */
                                <div className="flex gap-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                                    ))}
                                </div>
                             ) : (
                                /* Actual Palette */
                                <div className="flex gap-2">
                                    {palette.map((color, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleCopyColor(color)}
                                            className="group relative w-8 h-8 rounded-full border border-gray-200 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            style={{ backgroundColor: color }}
                                            title={`Copy ${color}`}
                                        >
                                            {copiedColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                            <span className="sr-only">Copy color {color}</span>
                                        </button>
                                    ))}
                                </div>
                             )}
                        </div>
                     )}

                     {/* Prompt */}
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt</h4>
                        <button onClick={() => handleCopyPrompt(selectedPhoto.prompt)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md">
                            {copied ? <><Check size={12} className="text-green-600" /><span className="text-green-600">Copied!</span></> : <><Copy size={12} /><span>Copy</span></>}
                        </button>
                     </div>
                     <div className="relative group cursor-pointer mb-6" onClick={() => handleCopyPrompt(selectedPhoto.prompt)}>
                        <p className="text-sm text-gray-600 leading-relaxed font-mono bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                            {selectedPhoto.prompt || "No prompt details available."}
                        </p>
                     </div>

                     {/* Tags */}
                     {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                        <div className="mb-8">
                            <div className="flex flex-wrap gap-2">
                                {selectedPhoto.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">#{tag}</span>
                                ))}
                            </div>
                        </div>
                     )}

                     {/* Related Images */}
                     <div className="mt-8 border-t border-gray-100 pt-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Sparkles size={12} className="text-yellow-500" /> Related Styles
                        </h4>

                        {loadingRelated ? (
                            <div className="grid grid-cols-3 gap-2">
                                {[1,2,3].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {relatedPhotos.map((related) => (
                                    <div
                                        key={related._id as unknown as string}
                                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-gray-100"
                                        onClick={() => setSelectedPhoto(related)}
                                    >
                                        <Image
                                            loader={cloudinaryLoader}
                                            src={related.imageUrl}
                                            alt={related.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            sizes="150px"
                                            placeholder={related.blurDataUrl ? "blur" : "empty"}
                                            blurDataURL={related.blurDataUrl}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loadingRelated && relatedPhotos.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No related images found.</p>
                        )}
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto shrink-0 pt-4 bg-white border-t border-gray-100">
                      <button
                        onClick={() => handleDownload(selectedPhoto)}
                        disabled={isDownloading}
                        className="flex-1 bg-black text-white py-3 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-gray-800 transition shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                      >
                        {isDownloading ? "Downloading..." : "Download"}
                      </button>
                      <button onClick={() => handleShare(selectedPhoto)} className="w-14 lg:w-16 bg-gray-100 text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-200 transition flex items-center justify-center border border-gray-200 hover:border-gray-300" title="Share"><Share2 size={24} /></button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CUSTOM CONTEXT MENU --- */}
      <AnimatePresence>
        {contextMenu && selectedPhoto && (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    zIndex: 9999
                }}
                className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-xl shadow-2xl p-1.5 min-w-[180px] flex flex-col gap-1 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={(e) => {
                        toggleFavorite(e, selectedPhoto._id as unknown as string);
                        setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700"
                >
                    <Heart size={16} className={favorites.includes(selectedPhoto._id as unknown as string) ? "fill-red-500 text-red-500" : "text-gray-500"} />
                    {favorites.includes(selectedPhoto._id as unknown as string) ? "Remove from Saved" : "Save to Favorites"}
                </button>

                <button
                    onClick={() => {
                        handleShare(selectedPhoto);
                        setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700"
                >
                    <Share2 size={16} className="text-gray-500" />
                    Share Image
                </button>

                <div className="h-px bg-gray-200 mx-1 my-0.5" />

                <button
                    onClick={() => {
                        handleDownload(selectedPhoto);
                        setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700"
                >
                    <Download size={16} className="text-gray-500" />
                    Download
                </button>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
