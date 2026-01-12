// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import { Toaster } from "sonner"; //

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Art Generator",
  description: "Generate and explore AI art.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} custom-scrollbar bg-background text-foreground antialiased`}>
        <QueryProvider>
          {children}
        </QueryProvider>
        {/* Position: where toasts appear. RichColors: success=green, error=red */}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
