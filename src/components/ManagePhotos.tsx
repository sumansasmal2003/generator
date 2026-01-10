"use client";

import { useEffect, useState } from "react";
import { IPhoto } from "@/models/Photo";
import { Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/cloudinaryLoader";

export default function ManagePhotos() {
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos?limit=100");
      const data = await res.json();
      setPhotos(data.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPhotos(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => (p._id as unknown as string) !== id));
      } else { alert("Failed to delete"); }
    } catch (error) { console.error(error); alert("Error deleting photo"); }
    finally { setDeletingId(null); }
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

      {/* 1. Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
                {photos.map((photo) => {
                    const safeId = photo._id as unknown as string;
                    return (
                        <tr key={safeId} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 w-24">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                    <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-cover" placeholder={photo.blurDataUrl ? "blur" : "empty"} blurDataURL={photo.blurDataUrl} sizes="64px" />
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <p className="font-semibold text-gray-800">{photo.title}</p>
                                <p className="text-xs text-gray-400 truncate max-w-xs">{photo.prompt}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{new Date(photo.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDelete(safeId)} disabled={deletingId === safeId} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                                    {deletingId === safeId ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
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
            return (
                <div key={safeId} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                        <Image loader={cloudinaryLoader} src={photo.imageUrl} alt={photo.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-bold text-gray-900 truncate">{photo.title}</h4>
                        <p className="text-xs text-gray-500 mb-3">{new Date(photo.createdAt).toLocaleDateString()}</p>
                        <button onClick={() => handleDelete(safeId)} className="self-start text-xs flex items-center gap-1 text-red-500 bg-red-100/50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                             {deletingId === safeId ? <Loader2 className="animate-spin w-3 h-3" /> : <Trash2 className="w-3 h-3" />} Delete
                        </button>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}
