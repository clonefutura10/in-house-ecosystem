import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { getToolsForRole } from './tools'
import { isPendingApproval } from './actions'
import { PendingApproval } from './schemas'

const SYSTEM_PROMPT = `You are a friendly AI assistant helping with task management. 
You work for a company and help employees and admins manage their tasks.

IMPORTANT RULES:
1. Always respond in natural, conversational language - never use technical terms like "executing", "tool call", "database operation", or "API".
2. Be helpful, concise, and friendly.
3. When you need more information to complete a request, ask follow-up questions naturally.
4. If a user asks something you can't help with, politely explain and suggest what you can help with (task management).

Available actions you can help with:
- Listing and viewing tasks
- Creating new tasks
- Updating task status (todo, in progress, review, done, blocked)
- For admins: assigning tasks, viewing all employees, managing all tasks

Examples of good responses:
- "You have 3 tasks due this week..."
- "What should I call this new task?"
- "I'll mark that as complete for you."

Examples of bad responses (NEVER say these):
- "Executing tool listMyTasks..."
- "The database operation was successful"
- "Tool call pending approval"`

type SupabaseClientType = SupabaseClient<Database>

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  pendingApproval?: PendingApproval
}

export interface AgentResponse {
  message: string
  pendingApproval?: PendingApproval
}

/**
 * Process a chat message and return the agent's response
 */
export async function processMessage(
  supabase: SupabaseClientType,
  userRole: 'admin' | 'employee',
  userId: string,
  messages: ChatMessage[]
): Promise<AgentResponse> {
  // Get tools for this user's role
  const tools = getToolsForRole(supabase, userRole, userId)

  // Create the LLM with tools bound
  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.7,
  }).bindTools(tools)

  // Convert messages to LangChain format
  const langchainMessages: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    ...messages.map((m) => {
      if (m.role === 'user') return new HumanMessage(m.content)
      if (m.role === 'assistant') return new AIMessage(m.content)
      return new SystemMessage(m.content)
    }),
  ]

  // Get the LLM response
  const response = await llm.invoke(langchainMessages)

  // Check if the LLM wants to call a tool
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0]
    const toolName = toolCall.name
    const toolArgs = toolCall.args

    // Find and execute the tool
    const tool = tools.find((t) => t.name === toolName)
    if (!tool) {
      return {
        message: `I'm not sure how to help with that. Can you try asking in a different way?`,
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).invoke(toolArgs)

      // Check if this result requires approval
      if (isPendingApproval(result)) {
        return {
          message: result.summary,
          pendingApproval: result,
        }
      }

      // For read-only operations, return the result directly
      return {
        message: String(result),
      }
    } catch (error) {
      console.error('Tool execution error:', error)
      return {
        message: `Sorry, I ran into a problem. Could you try that again?`,
      }
    }
  }

  // No tool call - just return the LLM's text response
  return {
    message: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
  }
}
