'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101a22] flex items-center justify-center p-4">
            <div className="text-center max-w-lg mx-auto">
                {/* Animated 404 */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] sm:text-[200px] font-bold text-[#1387ec]/10 leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="h-20 w-20 sm:h-24 sm:w-24 text-[#1387ec] animate-pulse" />
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Page Not Found
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                    Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Suggested Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        asChild
                        className="h-12 px-6 bg-[#1387ec] hover:bg-[#1387ec]/90 text-white font-semibold shadow-lg hover:shadow-[#1387ec]/25 transition-all"
                    >
                        <Link href="/dashboard">
                            <Home className="mr-2 h-5 w-5" />
                            Go to Dashboard
                        </Link>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-12 px-6 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Go Back
                    </Button>
                </div>

                {/* Decorative Elements */}
                <div className="mt-12 flex justify-center gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-[#1387ec]/30"
                            style={{
                                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Background Decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1387ec]/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#1387ec]/5 rounded-full blur-3xl" />
            </div>
        </div>
    )
}
