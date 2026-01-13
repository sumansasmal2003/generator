"use client";

import { useEffect, useState, useCallback } from "react";
import { IPhoto } from "@/models/Photo";
import { Trash2, Loader2, CheckSquare, Square, X, Search, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader";
import ConfirmationModal from "./ConfirmationModal";
import { toast } from "sonner";

export default function ManagePhotos() {
  // --- DATA STATE ---
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPhotos, setTotalPhotos] = useState(0);

  // --- PAGINATION & SEARCH STATE ---
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const LIMIT = 20; // Items per page

  // --- SELECTION STATE ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- MODAL STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photosToDelete, setPhotosToDelete] = useState<IPhoto[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- SEARCH DEBOUNCE ---
  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1); // Reset to page 1 on search
        setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // --- FETCH DATA ---
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch with pagination and search
      const query = new URLSearchParams({
          page: page.toString(),
          limit: LIMIT.toString(),
          search: debouncedSearch
      });

      const res = await fetch(`/api/photos?${query.toString()}`);
      const data = await res.json();

      setPhotos(data.data);
      setTotalPhotos(data.meta.total);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    // Check if all visible photos are selected
    const allVisibleSelected = photos.every(p => selectedIds.has(p._id as unknown as string));

    const newSelected = new Set(selectedIds);
    photos.forEach(p => {
        const id = p._id as unknown as string;
        if (allVisibleSelected) newSelected.delete(id);
        else newSelected.add(id);
    });
    setSelectedIds(newSelected);
  };

  // --- DELETE LOGIC ---
  const promptDelete = (items: IPhoto[]) => {
    setPhotosToDelete(items);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    const ids = photosToDelete.map(p => p._id as unknown as string);
    let successCount = 0;

    try {
      const deletePromises = ids.map(id =>
        fetch(`/api/photos/${id}`, { method: "DELETE" })
          .then(res => res.ok ? id : null)
      );

      const results = await Promise.all(deletePromises);
      const deletedIds = results.filter((id): id is string => id !== null);
      successCount = deletedIds.length;

      // Update UI (Optimistic update not easy with pagination, so we refetch)
      setSelectedIds(prev => {
        const next = new Set(prev);
        deletedIds.forEach(id => next.delete(id));
        return next;
      });

      if (successCount === ids.length) toast.success(`Deleted ${successCount} photos`);
      else toast.warning(`Deleted ${successCount}/${ids.length} photos`);

      fetchPhotos(); // Refetch to update list

    } catch (error) {
      console.error(error);
      toast.error("Error deleting photos");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setPhotosToDelete([]);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">

        {/* --- HEADER BAR --- */}
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Title & Total */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Library</h2>
                <p className="text-sm text-gray-500 font-medium">{totalPhotos} total items</p>
            </div>

            {/* Actions Area */}
            <div className="flex items-center gap-3 flex-1 md:justify-end">

                {/* Search Bar */}
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-black transition-colors" />
                    <input
                        type="text"
                        placeholder="Search title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    />
                </div>

                {/* Bulk Delete Action (Visible when selected) */}
                {selectedIds.size > 0 && (
                    <button
                        onClick={() => promptDelete(photos.filter(p => selectedIds.has(p._id as unknown as string)))}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-700 hover:shadow-lg transition-all animate-in fade-in slide-in-from-right-4"
                    >
                        <Trash2 size={16} /> <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                    </button>
                )}

                {/* Refresh Button */}
                <button
                    onClick={fetchPhotos}
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 hover:bg-black hover:text-white transition-all"
                    title="Refresh List"
                >
                    <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
          </div>
        </div>

        {/* --- TABLE CONTENT --- */}
        <div className="flex-1 overflow-x-auto relative">
           {loading && photos.length === 0 ? (
               // Loading Skeleton
               <div className="space-y-4 p-6">
                   {[...Array(5)].map((_, i) => (
                       <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                   ))}
               </div>
           ) : photos.length === 0 ? (
               // Empty State
               <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                   <Search size={48} className="mb-4 opacity-20" />
                   <p className="font-medium">No photos found matching your criteria.</p>
               </div>
           ) : (
               <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-semibold tracking-wider sticky top-0 backdrop-blur-sm z-10 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">
                                <button onClick={toggleAll} className="opacity-60 hover:opacity-100 transition">
                                    <CheckSquare size={18} className={selectedIds.size > 0 && photos.every(p => selectedIds.has(p._id as unknown as string)) ? "text-black" : "text-gray-400"} />
                                </button>
                            </th>
                            <th className="px-6 py-4">Preview</th>
                            <th className="px-6 py-4">Details</th>
                            <th className="px-6 py-4">Metadata</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {photos.map((photo) => {
                            const safeId = photo._id as unknown as string;
                            const isSelected = selectedIds.has(safeId);
                            return (
                                <tr
                                    key={safeId}
                                    className={`group transition-all duration-200 ${isSelected ? "bg-blue-50/30" : "hover:bg-gray-50"}`}
                                    onClick={() => toggleSelection(safeId)}
                                >
                                    <td className="px-6 py-4 text-center">
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-black border-black text-white" : "border-gray-300 bg-white"}`}>
                                            {isSelected && <CheckSquare size={14} />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 w-24">
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-gray-100 group-hover:scale-105 transition-transform">
                                            <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-cover" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 line-clamp-1">{photo.title}</p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-[200px]">{photo.prompt}</p>
                                        {photo.tags && photo.tags.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {photo.tags.slice(0, 2).map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 font-medium">#{t}</span>)}
                                                {photo.tags.length > 2 && <span className="text-[10px] text-gray-400">+{photo.tags.length - 2}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">{photo.width} x {photo.height}</span>
                                            <span className="text-xs text-gray-400">{new Date(photo.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); promptDelete([photo]); }}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Delete Photo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
           )}
        </div>

        {/* --- PAGINATION FOOTER --- */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
                Page {page} of {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={photosToDelete.length > 1 ? "Delete Multiple Items?" : "Delete Item?"}
        description={
            photosToDelete.length > 1
            ? `You are about to permanently delete ${photosToDelete.length} items. This cannot be undone.`
            : "You are about to permanently delete this item. This cannot be undone."
        }
        items={photosToDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
