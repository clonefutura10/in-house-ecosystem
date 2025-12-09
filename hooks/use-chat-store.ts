import { create } from 'zustand'
import { PendingApproval, ChatMessage, ApprovalResponse } from '@/lib/chat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  pendingApproval?: PendingApproval
  createdAt: Date
}

interface ChatStore {
  // State
  isOpen: boolean
  messages: Message[]
  sessionId: string | null
  pendingApproval: PendingApproval | null
  isLoading: boolean
  error: string | null

  // Actions
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (content: string) => Promise<void>
  handleApproval: (approved: boolean) => Promise<void>
  clearMessages: () => void
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  sessionId: null,
  pendingApproval: null,
  isLoading: false,
  error: null,

  // Actions
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  sendMessage: async (content: string) => {
    const { messages, sessionId, isLoading } = get()

    if (isLoading || !content.trim()) return

    // Add user message optimistically
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
    }

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      error: null,
    })

    try {
      // Prepare messages for API
      const apiMessages: ChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: content.trim() },
      ]

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        pendingApproval: data.pendingApproval || undefined,
        createdAt: new Date(),
      }

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        sessionId: data.sessionId || state.sessionId,
        pendingApproval: data.pendingApproval || null,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Chat error:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  },

  handleApproval: async (approved: boolean) => {
    const { pendingApproval, sessionId, messages } = get()

    if (!pendingApproval) return

    set({ isLoading: true, error: null })

    try {
      const approvalResponse: ApprovalResponse = {
        approved,
        action: pendingApproval.action,
        data: pendingApproval.data,
      }

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          sessionId,
          approvalResponse,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Something went wrong')
      }

      const data = await response.json()

      // Add the result message
      const resultMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date(),
      }

      set((state) => ({
        messages: [...state.messages, resultMessage],
        pendingApproval: null,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Approval error:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  },

  clearMessages: () =>
    set({
      messages: [],
      sessionId: null,
      pendingApproval: null,
      error: null,
    }),

  setError: (error) => set({ error }),
}))
