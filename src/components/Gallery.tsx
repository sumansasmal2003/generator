"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { IPhoto } from "@/models/Photo";
import PhotoCard from "./PhotoCard";
import {
  X, Search, Copy, Check, Share2, Heart, Download, Loader2, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader";
import ColorThief from "colorthief";
import { useInView } from "react-intersection-observer";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

// --- API FETCHERS ---
const fetchPhotos = async ({ pageParam = 1, queryKey }: any) => {
  const [_, { search, tag, favorites, ids }] = queryKey;

  let url = `/api/photos?page=${pageParam}&limit=15`;

  if (favorites && ids && ids.length > 0) {
    url += `&ids=${ids.join(",")}`;
  } else {
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return res.json();
};

const fetchTags = async () => {
  const res = await fetch("/api/tags");
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
};

// --- MASONRY HOOK ---
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({ width: 0 });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    if (typeof window !== "undefined") handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
}

interface ITag { _id: string; count: number; }

export default function Gallery() {
  // --- UI STATE ---
  const [selectedTag, setSelectedTag] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewFavorites, setViewFavorites] = useState(false);

  // Modals & Feedback
  const [selectedPhoto, setSelectedPhoto] = useState<IPhoto | null>(null);
  const [relatedPhotos, setRelatedPhotos] = useState<IPhoto[]>([]);
  const [palette, setPalette] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // --- INITIALIZE FAVORITES ---
  useEffect(() => {
    const saved = localStorage.getItem("generator_favorites");
    if (saved) try { setFavorites(JSON.parse(saved)); } catch {}
  }, []);

  // --- SEARCH DEBOUNCE ---
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
        if (search) setViewFavorites(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // --- REACT QUERY ---
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 5,
  });
  const availableTags: ITag[] = tagsData || [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['photos', {
        search: debouncedSearch,
        tag: selectedTag,
        favorites: viewFavorites,
        ids: viewFavorites ? favorites : null
    }],
    queryFn: fetchPhotos,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    refetchOnWindowFocus: false,
  });

  const allPhotos = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data) as IPhoto[];
  }, [data]);

  // --- INFINITE SCROLL ---
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "400px" });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);


  // --- MASONRY LAYOUT ---
  const { width } = useWindowSize();
  const getColumnCount = (w: number) => {
    if (w >= 1280) return 5;
    if (w >= 1024) return 4;
    if (w >= 768) return 3;
    if (w >= 640) return 2;
    return 1;
  };
  const columnCount = width > 0 ? getColumnCount(width) : 0;

  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [] as IPhoto[]);
    if (columnCount > 0) {
      allPhotos.forEach((photo, i) => {
        cols[i % columnCount].push(photo);
      });
    }
    return cols;
  }, [allPhotos, columnCount]);


  // --- NAVIGATION LOGIC ---
  const handleNavigate = useCallback((direction: 'next' | 'prev') => {
    if (!selectedPhoto || allPhotos.length === 0) return;

    const currentId = selectedPhoto._id as unknown as string;
    const currentIndex = allPhotos.findIndex(p => (p._id as unknown as string) === currentId);

    if (currentIndex === -1) return;

    if (direction === 'next') {
        if (currentIndex < allPhotos.length - 1) {
            setSelectedPhoto(allPhotos[currentIndex + 1]);
        }
    } else {
        if (currentIndex > 0) {
            setSelectedPhoto(allPhotos[currentIndex - 1]);
        }
    }
  }, [selectedPhoto, allPhotos]);

  // --- KEYBOARD LISTENER ---
  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
            case "ArrowRight":
                handleNavigate('next');
                break;
            case "ArrowLeft":
                handleNavigate('prev');
                break;
            case "Escape":
                setSelectedPhoto(null);
                break;
            default:
                break;
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, handleNavigate]);


  // --- HANDLERS ---
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let newFavs;
    if (favorites.includes(id)) {
        newFavs = favorites.filter(f => f !== id);
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
  };

  useEffect(() => {
    if (!selectedPhoto) return;
    const loadDetails = async () => {
        try {
             setRelatedPhotos([]);
             const tagsQuery = selectedPhoto.tags ? selectedPhoto.tags.join(",") : "";
             const id = selectedPhoto._id as unknown as string;
             const res = await fetch(`/api/photos/related?id=${id}&tags=${encodeURIComponent(tagsQuery)}`);
             const d = await res.json();
             setRelatedPhotos(d.data || []);

             const img = new window.Image();
             img.crossOrigin = "Anonymous";
             img.src = selectedPhoto.imageUrl;
             img.onload = () => {
                const colorThief = new ColorThief();
                const result = colorThief.getPalette(img, 5);
                if (result) setPalette(result.map((rgb: number[]) => `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`));
             };
        } catch (e) { console.error(e); }
    };
    loadDetails();
  }, [selectedPhoto]);


  const handleDownload = async (photo: IPhoto) => {
    setIsDownloading(true);
    try {
      const response = await fetch(photo.imageUrl);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${photo.title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) { alert("Download failed"); }
    finally { setIsDownloading(false); }
  };

  const handleShare = async (photo: IPhoto) => {
    const shareUrl = `${window.location.origin}/photo/${photo._id}`;
    if (navigator.share) {
      try { await navigator.share({ title: photo.title, text: `Check out this AI art: "${photo.prompt}"`, url: shareUrl }); } catch (err) { console.log(err); }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); alert("Link copied to clipboard!"); } catch (err) { console.error(err); }
    }
  };

  const handleCopy = (txt: string, isColor = false) => {
      navigator.clipboard.writeText(txt);
      if(isColor) { setCopiedColor(txt); setTimeout(() => setCopiedColor(null), 2000); }
      else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // Helper for determining button visibility
  const currentIndex = selectedPhoto ? allPhotos.findIndex(p => (p._id as unknown as string) === (selectedPhoto._id as unknown as string)) : -1;
  const showPrev = currentIndex > 0;
  const showNext = currentIndex !== -1 && currentIndex < allPhotos.length - 1;

  return (
    <div className="h-full relative flex flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pb-10 scroll-smooth">

        {/* HERO */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 sm:pt-16 pb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto space-y-6">
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Artificial</span>.
                </h2>
                <div className="relative group max-w-xl mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" /></div>
                    <input type="text" placeholder="Search tags, prompts..." className="block w-full pl-11 pr-4 py-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-base dark:text-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                    {(search || selectedTag || viewFavorites) && (<button onClick={clearFilters} className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black dark:hover:text-white"><X size={16} /></button>)}
                </div>
            </motion.div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-8">
            <div className="flex flex-nowrap sm:flex-wrap items-center sm:justify-center gap-2 overflow-x-auto pb-4 sm:pb-0 -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide snap-x">
                <button onClick={() => { setViewFavorites(!viewFavorites); setSelectedTag(""); setSearch(""); }} className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm font-bold transition-all border flex items-center gap-2 ${viewFavorites ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>
                    <Heart size={14} className={viewFavorites ? "fill-white" : ""} /> Saved <span className="opacity-70 text-xs ml-1">{favorites.length}</span>
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 hidden sm:block" />
                {availableTags.map((tag) => (
                    <button key={tag._id} onClick={() => { selectedTag === tag._id ? setSelectedTag("") : setSelectedTag(tag._id); setViewFavorites(false); setSearch(""); }} className={`flex-shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${selectedTag === tag._id ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-gray-200"}`}>
                        {tag._id}
                    </button>
                ))}
            </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 pb-12">
            {/* Loading */}
            {isLoading || columnCount === 0 ? (
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
                    {[...Array(10)].map((_, i) => ( <div key={i} className="w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl break-inside-avoid mb-6" style={{ height: `${[320, 450, 280, 380][i % 4]}px` }} /> ))}
                </div>
            ) : (
                <div className="flex gap-6 items-start">
                    {columns.map((columnPhotos, colIndex) => (
                        <div key={colIndex} className="flex flex-col gap-6 flex-1 min-w-0">
                            {columnPhotos.map((photo, index) => (
                                <PhotoCard
                                    key={photo._id as unknown as string}
                                    photo={photo}
                                    index={index}
                                    onView={setSelectedPhoto}
                                    isFavorite={favorites.includes(photo._id as unknown as string)}
                                    onToggleFavorite={(e) => toggleFavorite(e, photo._id as unknown as string)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && allPhotos.length === 0 && ( <div className="py-20 text-center text-gray-400"><p className="text-lg">No results found.</p></div> )}
            {isError && ( <div className="py-20 text-center text-red-500"><p>Something went wrong. Please try again.</p></div> )}
            {allPhotos.length > 0 && (
                <div ref={loadMoreRef} className="py-12 w-full flex justify-center h-24">
                    {isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
                            <Loader2 className="animate-spin text-blue-500" size={20} /> <span className="text-sm font-medium">Loading more...</span>
                        </div>
                    ) : hasNextPage ? ( <span className="sr-only">Load more</span> ) : (
                        <div className="flex flex-col items-center gap-2 mt-4">
                            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full" />
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-2">End of Gallery</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {selectedPhoto && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/95 sm:bg-black/90 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>

                {/* Close Button */}
                <div className="absolute top-4 right-4 z-50"><button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md" onClick={() => setSelectedPhoto(null)}><X size={24} /></button></div>

                {/* Main Modal Container */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-[100dvh] sm:h-[90vh] max-w-7xl bg-white dark:bg-black sm:rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl ring-1 ring-gray-900/5" onClick={(e) => e.stopPropagation()}>

                    {/* LEFT: IMAGE + NAVIGATION */}
                    <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden group" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ show: true, x: e.clientX, y: e.clientY }); }}>

                        {/* Nav Buttons (Visible on hover or mobile) */}
                        {showPrev && (
                            <button
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                                onClick={(e) => { e.stopPropagation(); handleNavigate('prev'); }}
                            >
                                <ChevronLeft size={32} />
                            </button>
                        )}
                        {showNext && (
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                                onClick={(e) => { e.stopPropagation(); handleNavigate('next'); }}
                            >
                                <ChevronRight size={32} />
                            </button>
                        )}

                        {/* Shared Element Image */}
                        <motion.div layoutId={`image-container-${selectedPhoto._id as unknown as string}`} className="relative w-full h-full flex items-center justify-center">
                             <div className="absolute inset-0 z-0 bg-gray-200 dark:bg-gray-800" style={{ backgroundImage: selectedPhoto.blurDataUrl ? `url("${selectedPhoto.blurDataUrl}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px)', transform: 'scale(1.2)' }} />
                             <div className="relative w-full h-full z-10 p-4 lg:p-12">
                                <Image loader={cloudinaryLoader} src={selectedPhoto.imageUrl} alt={selectedPhoto.title} fill className="object-contain drop-shadow-2xl" />
                             </div>
                        </motion.div>
                    </div>

                    {/* RIGHT: DETAILS */}
                    <div className="w-full lg:w-[400px] xl:w-[450px] bg-white dark:bg-black flex flex-col h-[40vh] lg:h-auto border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800">
                        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{selectedPhoto.title}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-6">{selectedPhoto.prompt}</p>
                            {palette.length > 0 && <div className="mb-6 flex gap-2">{palette.map((c, i) => <button key={i} onClick={() => handleCopy(c, true)} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" style={{ backgroundColor: c }}>{copiedColor === c && <div className="flex items-center justify-center h-full w-full bg-black/40 rounded-full"><Check size={12} className="text-white" /></div>}</button>)}</div>}
                            {relatedPhotos.length > 0 && <div className="grid grid-cols-3 gap-2">{relatedPhotos.map(r => <div key={r._id as unknown as string} className="aspect-square relative rounded-lg overflow-hidden cursor-pointer" onClick={() => setSelectedPhoto(r)}><Image loader={cloudinaryLoader} src={r.imageUrl} alt={r.title} fill className="object-cover" /></div>)}</div>}
                        </div>
                        <div className="p-4 lg:p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3"><button onClick={() => handleDownload(selectedPhoto)} disabled={isDownloading} className="flex-1 bg-black dark:bg-white text-white dark:text-black py-3.5 rounded-xl font-bold">{isDownloading ? "..." : "Download"}</button><button onClick={() => handleShare(selectedPhoto)} className="px-5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold"><Share2 size={20} /></button></div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
