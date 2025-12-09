'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import { useChatStore } from '@/hooks/use-chat-store'
import { MessageBubble } from './message-bubble'
import { ApprovalButtons } from './approval-buttons'
import { QuickActions } from './quick-actions'
import { ChatInput } from './chat-input'
import { cn } from '@/lib/utils'

export function ChatDrawer() {
    const {
        isOpen,
        close,
        messages,
        pendingApproval,
        isLoading,
        error,
        clearMessages,
        setError,
    } = useChatStore()

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const [isAnimating, setIsAnimating] = useState(false)
    const [shouldRender, setShouldRender] = useState(false)

    // Handle open/close with animation
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true)
            // Small delay to ensure render before animation
            requestAnimationFrame(() => {
                setIsAnimating(true)
            })
        } else if (shouldRender) {
            setIsAnimating(false)
            // Wait for animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false)
            }, 300) // Match animation duration
            return () => clearTimeout(timer)
        }
    }, [isOpen, shouldRender])

    // Scroll to bottom when messages change or drawer opens
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, pendingApproval, isOpen])

    // Scroll to bottom immediately when drawer first opens
    useEffect(() => {
        if (isOpen && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
    }, [isOpen])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                close()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, close])

    if (!shouldRender) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity duration-300',
                    isAnimating ? 'opacity-100' : 'opacity-0'
                )}
                onClick={close}
                aria-hidden="true"
            />

            {/* Drawer */}
            <aside
                className={cn(
                    'fixed top-0 right-0 h-full w-[440px] max-w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-out',
                    isAnimating ? 'translate-x-0' : 'translate-x-full'
                )}
                role="dialog"
                aria-label="AI Assistant"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        AI Assistant
                    </h2>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={clearMessages}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                                title="Start new conversation"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={close}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 p-4 space-y-4 overflow-y-auto"
                >
                    {/* Welcome message */}
                    {messages.length === 0 && !isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 max-w-[85%]">
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    Hello! How can I help you with your tasks today?
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Message list */}
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            content={message.content}
                            role={message.role}
                        />
                    ))}

                    {/* Pending approval - show buttons under the last message */}
                    {pendingApproval && <ApprovalButtons />}

                    {/* Loading indicator */}
                    {isLoading && !pendingApproval && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <p>{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-500 hover:text-red-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <QuickActions />
                    <ChatInput />
                </div>
            </aside>
        </>
    )
}
