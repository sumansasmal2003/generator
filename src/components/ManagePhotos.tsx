"use client";

import { useEffect, useState, useMemo } from "react";
import { IPhoto } from "@/models/Photo";
import { Trash2, Loader2, CheckSquare, Square, X } from "lucide-react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader";
import ConfirmationModal from "./ConfirmationModal"; // Import the modal
import { toast } from "sonner"; // Assuming you installed this from previous step

export default function ManagePhotos() {
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photosToDelete, setPhotosToDelete] = useState<IPhoto[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos?limit=100");
      const data = await res.json();
      setPhotos(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPhotos(); }, []);

  // --- SELECTION LOGIC ---
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      const allIds = new Set(photos.map(p => p._id as unknown as string));
      setSelectedIds(allIds);
    }
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

    // Note: Ideally, you'd create a specific bulk-delete API endpoint.
    // For now, we perform parallel requests to keep backend changes minimal.
    try {
      const deletePromises = ids.map(id =>
        fetch(`/api/photos/${id}`, { method: "DELETE" })
          .then(res => res.ok ? id : null)
      );

      const results = await Promise.all(deletePromises);
      const deletedIds = results.filter((id): id is string => id !== null);
      successCount = deletedIds.length;

      // Update UI
      setPhotos(prev => prev.filter(p => !deletedIds.includes(p._id as unknown as string)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        deletedIds.forEach(id => next.delete(id));
        return next;
      });

      if (successCount === ids.length) {
        toast.success(`Successfully deleted ${successCount} photos`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} of ${ids.length} photos`);
      } else {
        toast.error("Failed to delete photos");
      }

    } catch (error) {
      console.error(error);
      toast.error("An error occurred during deletion");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setPhotosToDelete([]);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading library...</div>;

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">

        {/* Header / Bulk Actions Bar */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 min-h-[88px]">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-4 w-full animate-in fade-in slide-in-from-top-2 duration-200">
               <div className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-full shadow-lg">
                  <span className="text-sm font-bold">{selectedIds.size} Selected</span>
                  <button onClick={() => setSelectedIds(new Set())} className="hover:text-gray-300"><X size={14}/></button>
               </div>
               <div className="flex-1" />
               <button
                onClick={() => {
                  const items = photos.filter(p => selectedIds.has(p._id as unknown as string));
                  promptDelete(items);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
               >
                 <Trash2 size={18} /> Delete Selected
               </button>
            </div>
          ) : (
            <div className="flex justify-between w-full items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Library Management</h2>
                    <p className="text-sm text-gray-500">Total Photos: {photos.length}</p>
                </div>
            </div>
          )}
        </div>

        {/* 1. Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-medium">
                  <tr>
                      <th className="px-6 py-4 w-12">
                        <button onClick={toggleAll} className="flex items-center text-gray-400 hover:text-black transition">
                          {selectedIds.size === photos.length && photos.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="px-6 py-4">Preview</th>
                      <th className="px-6 py-4">Title / Prompt</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {photos.map((photo) => {
                      const safeId = photo._id as unknown as string;
                      const isSelected = selectedIds.has(safeId);

                      return (
                          <tr
                            key={safeId}
                            onClick={() => toggleSelection(safeId)}
                            className={`transition-colors cursor-pointer ${isSelected ? "bg-blue-50/50" : "hover:bg-gray-50/80"}`}
                          >
                              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => toggleSelection(safeId)} className={`transition ${isSelected ? "text-blue-600" : "text-gray-300 hover:text-gray-500"}`}>
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </button>
                              </td>
                              <td className="px-6 py-4 w-24">
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                      <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-cover" />
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <p className="font-semibold text-gray-800">{photo.title}</p>
                                  <p className="text-xs text-gray-400 truncate max-w-xs">{photo.prompt}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">{new Date(photo.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); promptDelete([photo]); }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
        </div>

        {/* 2. Mobile Card View */}
        <div className="md:hidden grid grid-cols-1 gap-4 p-4">
          {photos.map((photo) => {
              const safeId = photo._id as unknown as string;
              const isSelected = selectedIds.has(safeId);

              return (
                  <div
                    key={safeId}
                    onClick={() => toggleSelection(safeId)}
                    className={`flex gap-4 p-4 rounded-2xl border transition-all ${isSelected ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" : "bg-gray-50 border-gray-100"}`}
                  >
                      {/* Mobile Checkbox */}
                      <div className="flex items-center">
                         {isSelected ? <CheckSquare size={24} className="text-blue-500" /> : <Square size={24} className="text-gray-300" />}
                      </div>

                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                          <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-bold text-gray-900 truncate">{photo.title}</h4>
                          <p className="text-xs text-gray-500 mb-3">{new Date(photo.createdAt).toLocaleDateString()}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); promptDelete([photo]); }}
                            className="self-start text-xs flex items-center gap-1 text-red-500 bg-white border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                          >
                               <Trash2 className="w-3 h-3" /> Delete
                          </button>
                      </div>
                  </div>
              );
          })}
        </div>
      </div>

      {/* 3. Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={photosToDelete.length > 1 ? "Delete Multiple Photos?" : "Delete Photo?"}
        description={
            photosToDelete.length > 1
            ? `Are you sure you want to delete these ${photosToDelete.length} photos? This action cannot be undone.`
            : "Are you sure you want to delete this photo? This action cannot be undone."
        }
        items={photosToDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
