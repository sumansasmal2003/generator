// src/components/ManagePhotos.tsx
"use client";

import { useEffect, useState } from "react";
import { IPhoto } from "@/models/Photo";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader"; // <--- 1. Import Loader

export default function ManagePhotos() {
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch all photos (simple fetch for management list)
  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos?limit=100"); // Fetching up to 100 for admin view
      const data = await res.json();
      setPhotos(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Remove from local state immediately
        setPhotos((prev) => prev.filter((p) => (p._id as string) !== id));
      } else {
        alert("Failed to delete");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting photo");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading library...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div>
            <h2 className="text-xl font-bold text-gray-800">Library Management</h2>
            <p className="text-sm text-gray-500">Total Photos: {photos.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-medium">
                <tr>
                    <th className="px-6 py-4">Preview</th>
                    <th className="px-6 py-4">Title / Prompt</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {photos.map((photo) => (
                    <tr key={photo._id as string} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 w-24">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                <Image
                                    loader={cloudinaryLoader} // <--- 2. Use Loader (Vital for list views)
                                    src={photo.imageUrl}
                                    alt={photo.title}
                                    fill
                                    className="object-cover"

                                    // <--- 3. Blur Settings
                                    placeholder={photo.blurDataUrl ? "blur" : "empty"}
                                    blurDataURL={photo.blurDataUrl}

                                    // <--- 4. Optimization: Only download a tiny thumbnail size
                                    sizes="64px"
                                />
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{photo.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-xs">{photo.prompt}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(photo.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button
                                onClick={() => handleDelete(photo._id as string)}
                                disabled={deletingId === (photo._id as string)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete Permanently"
                            >
                                {deletingId === (photo._id as string) ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        </td>
                    </tr>
                ))}
                {photos.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                            No photos found in the library.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
