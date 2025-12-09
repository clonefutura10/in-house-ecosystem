import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage } from '@langchain/core/messages'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { getToolsForRole } from './tools'
import { isPendingApproval } from './actions'
import { PendingApproval } from './schemas'

const EMPLOYEE_SYSTEM_PROMPT = `You are a helpful task management assistant for employees.

CRITICAL: You MUST use the available tools to fulfill requests. Do NOT make up task information.

Your capabilities for employees:
- listMyTasks: Show tasks assigned to you (can filter by status, priority, or due date)
- getTaskDetails: Get details about a specific task
- updateTaskStatus: Change your task's status (requires approval)
- createTaskForSelf: Create a new task assigned to yourself (requires approval)

When a user asks about tasks, ALWAYS use the appropriate tool. Examples:
- "What are my tasks?" → Use listMyTasks
- "Tasks due this week?" → Use listMyTasks with dueWithin: "this_week"
- "Mark task X as done" → Use updateTaskStatus
- "Create a task for me" → Use createTaskForSelf

Respond naturally and friendly. Never mention "tools", "functions", or "database".
If you need more details to complete a request, ask a follow-up question.`

const ADMIN_SYSTEM_PROMPT = `You are a helpful task management assistant for administrators.

CRITICAL: You MUST use the available tools to fulfill requests. Do NOT make up information.

Your capabilities for admins:
- listMyTasks: Show tasks assigned to you
- listAllTasks: Show all tasks in the system
- getTaskDetails: Get details about any task
- updateTaskStatus: Change any task's status (requires approval)
- createTaskForSelf: Create a task for yourself (requires approval)
- createTask: Create a task and assign to anyone (requires approval)
- updateTask: Update task details (requires approval)
- deleteTask: Archive a task (requires approval)
- listEmployees: Show all employees
- assignTask: Assign a task to an employee (requires approval)
- searchTaskByTitle: Find a task by searching its title

When a user asks about tasks, ALWAYS use the appropriate tool. Examples:
- "Show all tasks" → Use listAllTasks
- "Show my tasks" → Use listMyTasks
- "Create a task for John" → Use listEmployees to find John, then createTask
- "Who's on the team?" → Use listEmployees
- "Assign the task I just created to..." → Use searchTaskByTitle to find it, then assignTask

Respond naturally and professionally. Never mention "tools", "functions", or "database".
If you need more details, ask a follow-up question.`

function getSystemPrompt(role: 'admin' | 'employee'): string {
  return role === 'admin' ? ADMIN_SYSTEM_PROMPT : EMPLOYEE_SYSTEM_PROMPT
}

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

  // Create the LLM with tools bound - lower temperature for more consistent tool usage
  const llm = new ChatOpenAI({
    // model: 'gpt-4o-mini',
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.3,
  }).bindTools(tools)

  // Convert messages to LangChain format
  const langchainMessages: BaseMessage[] = [
    new SystemMessage(getSystemPrompt(userRole)),
    ...messages.map((m) => {
      if (m.role === 'user') return new HumanMessage(m.content)
      if (m.role === 'assistant') return new AIMessage(m.content)
      return new SystemMessage(m.content)
    }),
  ]

  try {
    // Get the LLM response
    const response = await llm.invoke(langchainMessages)

    // Check if the LLM wants to call a tool
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0]
      const toolName = toolCall.name
      const toolArgs = toolCall.args

      console.log(`[Chatbot] Tool called: ${toolName}`, toolArgs)

      // Find and execute the tool
      const tool = tools.find((t) => t.name === toolName)
      if (!tool) {
        console.error(`[Chatbot] Tool not found: ${toolName}`)
        return {
          message: `I'm not sure how to help with that. Can you try asking in a different way?`,
        }
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (tool as any).invoke(toolArgs)

        console.log(`[Chatbot] Tool result:`, result)

        // Check if this result requires approval
        if (isPendingApproval(result)) {
          return {
            message: result.summary,
            pendingApproval: result,
          }
        }

        // For read-only operations, the tool returns a formatted string
        // We can optionally have the LLM refine this, but for now return directly
        return {
          message: String(result),
        }
      } catch (error) {
        console.error('[Chatbot] Tool execution error:', error)
        return {
          message: `Sorry, I ran into a problem fetching that information. Could you try again?`,
        }
      }
    }

    // No tool call - just return the LLM's text response
    const content = response.content
    console.log('[Chatbot] No tool call, returning text response')
    return {
      message: typeof content === 'string' ? content : JSON.stringify(content),
    }
  } catch (error) {
    console.error('[Chatbot] LLM invocation error:', error)
    return {
      message: `Sorry, I'm having trouble processing your request. Please try again.`,
    }
  }
}
