import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101a22] flex items-center justify-center">
            <div className="text-center">
                {/* Logo Spinner */}
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-[#1387ec] flex items-center justify-center animate-pulse">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                </div>

                {/* Loading Text */}
                <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1387ec]" />
                    <span className="text-lg font-medium">Loading...</span>
                </div>

                {/* Animated Dots */}
                <div className="mt-8 flex justify-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#1387ec] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-3 h-3 rounded-full bg-[#1387ec] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-3 h-3 rounded-full bg-[#1387ec] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    )
}
