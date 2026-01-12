"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import Image from "next/image";
import { IPhoto } from "@/models/Photo";
import cloudinaryLoader from "@/lib/cloudinaryLoader";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  items: IPhoto[]; // Photos being deleted
  isDeleting: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  items,
  isDeleting,
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    {description}
                  </p>

                  {/* Thumbnails Preview */}
                  <div className="bg-gray-50 dark:bg-black/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800 mb-6">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      Selected Items ({items.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {items.slice(0, 5).map((item) => (
                        <div key={item._id as string} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            loader={cloudinaryLoader}
                            src={item.imageUrl}
                            alt="Thumbnail"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {items.length > 5 && (
                        <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                          +{items.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={onClose}
                      disabled={isDeleting}
                      className="px-4 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onConfirm}
                      disabled={isDeleting}
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                    >
                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
