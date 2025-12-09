'use client'

import { cn } from '@/lib/utils'

interface MessageBubbleProps {
    content: string
    role: 'user' | 'assistant'
}

export function MessageBubble({ content, role }: MessageBubbleProps) {
    const isUser = role === 'user'

    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'rounded-lg p-3 max-w-[85%]',
                    isUser
                        ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                )}
            >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
        </div>
    )
}
