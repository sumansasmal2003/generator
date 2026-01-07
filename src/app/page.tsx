// src/app/page.tsx
import Link from "next/link";
import Gallery from "@/components/Gallery";
import { Sparkles, UploadCloud } from "lucide-react";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-white text-gray-900 flex flex-col font-sans">

      {/* Minimalist Header */}
      <header className="flex-none h-16 bg-white/80 backdrop-blur-md z-30 px-6 lg:px-12 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
                <Sparkles size={18} fill="currentColor" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Generator</h1>
          </div>

          <Link
            href="/admin"
            className="group flex items-center text-sm font-medium text-gray-500 hover:text-black transition-all bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300"
          >
            <UploadCloud className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
            Upload Creation
          </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-0">
        <Gallery />
      </div>

    </main>
  );
}
