'use client'

import { useChatStore } from '@/hooks/use-chat-store'

const QUICK_ACTIONS = [
    { label: 'Show my pending tasks', prompt: 'Show me my pending tasks' },
    { label: "What's due this week?", prompt: "What tasks are due this week?" },
]

export function QuickActions() {
    const { sendMessage, isLoading, messages } = useChatStore()

    // Only show quick actions when there are no messages
    if (messages.length > 0) {
        return null
    }

    return (
        <div className="flex flex-wrap justify-center gap-2 mb-3">
            {QUICK_ACTIONS.map((action) => (
                <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    {action.label}
                </button>
            ))}
        </div>
    )
}
