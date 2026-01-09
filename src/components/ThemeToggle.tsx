// src/components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white text-yellow-500 shadow-md' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-md' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
        title="System Mode"
      >
        <Monitor size={16} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-gray-700 text-purple-400 shadow-md' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
