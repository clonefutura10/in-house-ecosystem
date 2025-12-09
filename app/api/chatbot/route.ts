import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  processMessage,
  executeApprovedAction,
  ChatMessage,
  ApprovalResponse,
} from '@/lib/chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  messages: ChatMessage[]
  sessionId?: string
  approvalResponse?: ApprovalResponse
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to use the assistant.' },
        { status: 401 }
      )
    }

    // Get user's role from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Could not find your profile.' },
        { status: 403 }
      )
    }

    const userRole = profile.role as 'admin' | 'employee'
    const body: ChatRequest = await req.json()
    const { messages, sessionId, approvalResponse } = body

    // Handle approval response (user clicked Approve/Cancel)
    if (approvalResponse) {
      const result = await executeApprovedAction(supabase, approvalResponse)

      // Save the result to chat history if we have a session
      if (sessionId) {
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: result,
        })
      }

      return NextResponse.json({
        message: result,
        pendingApproval: null,
      })
    }

    // Process regular message
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Please provide a message.' },
        { status: 400 }
      )
    }

    // Get or create chat session
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: messages[0]?.content?.slice(0, 50) || 'New Chat',
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
      } else {
        currentSessionId = newSession?.id
      }
    }

    // Save user message
    if (currentSessionId) {
      const lastUserMessage = messages[messages.length - 1]
      if (lastUserMessage?.role === 'user') {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'user',
          content: lastUserMessage.content,
        })
      }
    }

    // Process with agent
    const response = await processMessage(supabase, userRole, user.id, messages)

    // Save assistant response (if not pending approval, which will be saved after approval)
    if (currentSessionId && !response.pendingApproval) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: response.message,
      })
    }

    return NextResponse.json({
      message: response.message,
      pendingApproval: response.pendingApproval || null,
      sessionId: currentSessionId,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// Get chat history for a session
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Get messages for specific session
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: 'Could not fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages })
    }

    // Get list of sessions
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Could not fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
