'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useChatStore } from '@/hooks/use-chat-store'

export function ChatInput() {
    const [input, setInput] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const { sendMessage, isLoading, pendingApproval } = useChatStore()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (input.trim() && !isLoading && !pendingApproval) {
            sendMessage(input)
            setInput('')
        }
    }

    // Focus input when drawer opens
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const isDisabled = isLoading || !!pendingApproval

    return (
        <form onSubmit={handleSubmit} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                    pendingApproval
                        ? 'Please respond to the action above...'
                        : 'Type your message...'
                }
                disabled={isDisabled}
                className="w-full pl-4 pr-12 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                    type="submit"
                    disabled={isDisabled || !input.trim()}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </button>
            </div>
        </form>
    )
}
