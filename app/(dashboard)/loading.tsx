import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <div className="flex h-screen bg-[#f6f7f8] dark:bg-[#101a22]">
            {/* Sidebar Skeleton */}
            <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex flex-col gap-4 p-4">
                    {/* Logo Skeleton */}
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="h-6 w-24" />
                    </div>

                    {/* Nav Items Skeleton */}
                    <nav className="flex flex-col gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2">
                                <Skeleton className="w-5 h-5 rounded" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </nav>
                </div>

                {/* User Skeleton */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header Skeleton */}
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-5 w-80" />
                    </div>

                    {/* Stats Cards Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="w-5 h-5" />
                                </div>
                                <Skeleton className="h-8 w-20" />
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                        <div className="xl:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <Skeleton className="h-5 w-40 mb-4" />
                            <Skeleton className="h-64 w-full rounded-lg" />
                        </div>
                        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                            <Skeleton className="h-5 w-40 mb-4" />
                            <div className="h-64 flex items-end justify-between gap-3">
                                {[60, 75, 90, 50, 80].map((h, i) => (
                                    <Skeleton
                                        key={i}
                                        className="w-full rounded-t-md"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Activity Skeleton */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Skeleton className="h-5 w-32 mb-6" />
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-8 h-8 rounded-full" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
