import Link from "next/link";
import Gallery from "@/components/Gallery";
import { Sparkles, UploadCloud } from "lucide-react";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans relative selection:bg-pink-500/30">

      {/* Glassmorphic Header */}
      <header className="flex-none h-16 sm:h-20 bg-white/70 dark:bg-black/70 backdrop-blur-xl z-40 px-4 sm:px-8 lg:px-12 flex items-center justify-between border-b border-gray-200/50 dark:border-white/10 transition-all">

          {/* Brand */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-black dark:bg-white text-white dark:text-black p-2.5 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Sparkles size={20} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Generator</h1>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
             {/* Mobile: Icon Only | Desktop: Full Button */}
            <Link
              href="/admin"
              className="group flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-all bg-gray-100/50 dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 px-3 py-2 sm:px-5 sm:py-2.5 rounded-full border border-transparent hover:border-gray-200 dark:hover:border-white/10"
            >
              <UploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Upload Creation</span>
            </Link>
          </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative min-h-0">
        <Gallery />
      </div>

    </main>
  );
}
