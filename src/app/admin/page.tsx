"use client";

import UploadForm from "@/components/UploadForm";
import ManagePhotos from "@/components/ManagePhotos";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
    } catch (e) {
        toast.error("Logout failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
               <div className="p-2.5 bg-black text-white rounded-xl">
                    <LayoutDashboard size={24} />
               </div>
               <div>
                   <h1 className="text-xl font-bold text-gray-900 leading-none">Admin Dashboard</h1>
                   <p className="text-xs text-gray-500 font-medium mt-1">Manage content & uploads</p>
               </div>
           </div>

           <button
             onClick={handleLogout}
             className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
           >
             <LogOut size={18} />
             Logout
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        <section>
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Upload New Content</h2>
                <div className="h-1 w-12 bg-black mt-2 rounded-full opacity-20" />
             </div>
             <UploadForm />
        </section>

        <section>
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
                <div className="h-1 w-12 bg-black mt-2 rounded-full opacity-20" />
             </div>
             <ManagePhotos />
        </section>
      </div>
    </div>
  );
}
