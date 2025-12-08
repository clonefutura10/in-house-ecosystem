import { cn } from '@/lib/utils'

interface PageContainerProps {
    children: React.ReactNode
    className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <main className="flex-1 p-8 overflow-y-auto">
            <div className={cn('max-w-7xl mx-auto', className)}>{children}</div>
        </main>
    )
}
