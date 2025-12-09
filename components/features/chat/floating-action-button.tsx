'use client'

import { Sparkles } from 'lucide-react'
import { useChatStore } from '@/hooks/use-chat-store'

export function ChatFAB() {
    const { toggle } = useChatStore()

    return (
        <button
            onClick={toggle}
            className="fixed bottom-8 right-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-3 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors z-50 hover:scale-105 active:scale-95"
            aria-label="Open AI Assistant"
        >
            <Sparkles className="h-6 w-6" />
        </button>
    )
}
