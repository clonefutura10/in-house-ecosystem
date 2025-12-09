'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/hooks/use-chat-store'
import { PendingApproval } from '@/lib/chat'

interface ApprovalButtonsProps {
    action: PendingApproval
}

export function ApprovalButtons({ action }: ApprovalButtonsProps) {
    const { handleApproval, isLoading } = useChatStore()

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                {action.summary}
            </p>

            <div className="flex gap-2">
                <Button
                    onClick={() => handleApproval(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                    size="sm"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4 mr-2" />
                    )}
                    Yes, go ahead
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleApproval(false)}
                    disabled={isLoading}
                    size="sm"
                >
                    <X className="h-4 w-4 mr-2" />
                    No, cancel
                </Button>
            </div>
        </div>
    )
}
