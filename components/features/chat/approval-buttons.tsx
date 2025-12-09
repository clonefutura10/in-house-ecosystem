'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/hooks/use-chat-store'

export function ApprovalButtons() {
    const { handleApproval, isLoading } = useChatStore()

    return (
        <div className="flex gap-2 mt-2">
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
    )
}
