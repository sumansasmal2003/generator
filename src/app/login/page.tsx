"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        toast.success("Authentication successful");
        router.push("/admin");
        router.refresh();
      } else {
        toast.error("Access denied. Invalid credentials.");
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-black overflow-hidden">

      {/* --- LEFT SIDE: BRANDING (Hidden on mobile) --- */}
      <div className="hidden lg:flex w-1/2 bg-black relative items-center justify-center overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#333_0%,_#000_100%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />

        <div className="relative z-10 max-w-lg px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
               <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight">Secure Admin<br />Portal</h1>
            <p className="text-lg text-gray-400 leading-relaxed font-light">
              Manage your AI generation gallery, curate content, and monitor system performance from a unified control center.
            </p>
          </motion.div>

          {/* Decorative Stat Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-1">99.9%</h3>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Uptime</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white mb-1">AES-256</h3>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Encryption</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* --- RIGHT SIDE: LOGIN FORM --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 bg-gray-50 dark:bg-gray-900/50 relative">
        {/* Mobile Background Decoration */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-black z-0" />

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.4 }}
           className="w-full max-w-md relative z-10"
        >
          <div className="bg-white dark:bg-black p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800">

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 ring-1 ring-gray-200 dark:ring-gray-700">
                 <Lock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Welcome Back</h2>
              <p className="text-sm text-gray-500 mt-2">Please enter your credentials to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-black dark:focus:border-white rounded-xl px-4 py-4 outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-300 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-800"
                    autoFocus
                    />
                    {/* Active Status Indicator */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <>Sign In <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-xs text-gray-400 font-mono">
                    Restricted Access • Authorized Personnel Only <br/>
                    <span className="opacity-50">System v2.0.4</span>
                </p>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
