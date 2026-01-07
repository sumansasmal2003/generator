// src/app/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import UploadForm from "@/components/UploadForm";
import ManagePhotos from "@/components/ManagePhotos";
import { ArrowLeft, Upload, List } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload");

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link
            href="/"
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm text-gray-600"
            >
            <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage your gallery content</p>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            <button
                onClick={() => setActiveTab("upload")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "upload"
                    ? "bg-black text-white shadow-md"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
                }`}
            >
                <Upload size={16} className="mr-2" /> Upload
            </button>
            <button
                onClick={() => setActiveTab("manage")}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "manage"
                    ? "bg-black text-white shadow-md"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
                }`}
            >
                <List size={16} className="mr-2" /> Library
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto">
        {activeTab === "upload" ? <UploadForm /> : <ManagePhotos />}
      </div>

    </main>
  );
}
