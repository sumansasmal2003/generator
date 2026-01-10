"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Ensure QueryClient is created once per client lifecycle
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 1 minute (prevents immediate refetching on window focus)
        staleTime: 60 * 1000,
        // Do not retry on 404s
        retry: (failureCount, error: any) => {
            if (error?.status === 404) return false;
            return failureCount < 2;
        }
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
