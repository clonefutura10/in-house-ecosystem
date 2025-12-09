import { tool } from '@langchain/core/tools'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import {
  listTasksInputSchema,
  getTaskDetailsInputSchema,
  updateTaskStatusInputSchema,
  createTaskInputSchema,
  PendingApproval,
} from '../schemas'

type SupabaseClientType = SupabaseClient<Database>

// Helper to get date bounds
function getDateBounds(filter: string): { start: Date; end: Date } | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (filter) {
    case 'today':
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { start: today, end: tomorrow }
    case 'this_week':
      const endOfWeek = new Date(today)
      endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()))
      return { start: today, end: endOfWeek }
    case 'overdue':
      return { start: new Date(0), end: today }
    default:
      return null
  }
}

// List tasks assigned to current user
export function createListMyTasksTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ status, priority, dueWithin }) => {
      let query = supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at')
        .eq('assigned_to', userId)
        .eq('is_archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (status) {
        query = query.eq('status', status)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }
      
      // Apply date filter
      if (dueWithin) {
        if (dueWithin === 'no_date') {
          query = query.is('due_date', null)
        } else {
          const bounds = getDateBounds(dueWithin)
          if (bounds) {
            query = query.gte('due_date', bounds.start.toISOString())
              .lt('due_date', bounds.end.toISOString())
          }
        }
      }

      const { data: tasks, error } = await query.limit(20)

      if (error) {
        console.error('[listMyTasks] Error:', error)
        return `I had trouble getting your tasks. Please try again.`
      }

      if (!tasks || tasks.length === 0) {
        const filterDesc = dueWithin === 'this_week' ? 'due this week' : 
                          dueWithin === 'today' ? 'due today' :
                          dueWithin === 'overdue' ? 'overdue' :
                          status ? `with status "${status.replace('_', ' ')}"` : ''
        return `You don't have any tasks ${filterDesc}.`.trim()
      }

      const taskList = tasks
        .map((t, i) => {
          const dueStr = t.due_date
            ? `due ${new Date(t.due_date).toLocaleDateString()}`
            : 'no due date'
          return `${i + 1}. "${t.title}" - ${t.status?.replace('_', ' ')} (${t.priority}, ${dueStr})`
        })
        .join('\n')

      const headerDesc = dueWithin === 'this_week' ? 'due this week' :
                        dueWithin === 'today' ? 'due today' :
                        dueWithin === 'overdue' ? 'overdue' : ''
      
      return `Here are your tasks${headerDesc ? ` ${headerDesc}` : ''}:\n\n${taskList}`
    },
    {
      name: 'listMyTasks',
      description: 'List tasks assigned to you. Can filter by status, priority, or due date (today, this_week, overdue, no_date).',
      schema: listTasksInputSchema,
    }
  )
}

// Get task details
export function createGetTaskDetailsTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ taskId }) => {
      const { data: task, error } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, priority, due_date, 
          created_at, tags,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name),
          created_by_profile:profiles!tasks_created_by_fkey(full_name)
        `)
        .eq('id', taskId)
        .single()

      if (error || !task) {
        return `I couldn't find that task. Please check the task ID.`
      }

      const assignee = (task.assigned_to_profile as { full_name: string } | null)?.full_name || 'Unassigned'
      const creator = (task.created_by_profile as { full_name: string } | null)?.full_name || 'Unknown'
      const dueDate = task.due_date
        ? new Date(task.due_date).toLocaleDateString()
        : 'No due date'

      return `**${task.title}**
      
Status: ${task.status?.replace('_', ' ')}
Priority: ${task.priority}
Due: ${dueDate}
Assigned to: ${assignee}
Created by: ${creator}
${task.description ? `\nDescription: ${task.description}` : ''}
${task.tags?.length ? `Tags: ${task.tags.join(', ')}` : ''}`
    },
    {
      name: 'getTaskDetails',
      description: 'Get detailed information about a specific task by its ID.',
      schema: getTaskDetailsInputSchema,
    }
  )
}

// Update task status (returns pending approval)
export function createUpdateTaskStatusTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ taskId, status }): Promise<string | PendingApproval> => {
      // First get the task to show in summary
      const { data: task } = await supabase
        .from('tasks')
        .select('title, status')
        .eq('id', taskId)
        .single()

      if (!task) {
        return `I couldn't find that task. Please check the task ID.`
      }

      const statusDisplay = status.replace('_', ' ')
      const currentStatus = task.status?.replace('_', ' ') || 'unknown'

      return {
        requiresApproval: true,
        action: 'updateTaskStatus',
        data: { taskId, status, userId },
        summary: `I'll change "${task.title}" from ${currentStatus} to ${statusDisplay}. Is that right?`,
      }
    },
    {
      name: 'updateTaskStatus',
      description: 'Update the status of a task. Statuses: todo, in_progress, review, done, blocked.',
      schema: updateTaskStatusInputSchema,
    }
  )
}

// Create task for self (employee tool - auto-assigns to current user)
export function createCreateTaskForSelfTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ title, description, priority, dueDate }): Promise<PendingApproval> => {
      const dueDateStr = dueDate
        ? ` due on ${new Date(dueDate).toLocaleDateString()}`
        : ''

      return {
        requiresApproval: true,
        action: 'createTask',
        data: {
          title,
          description: description || null,
          priority,
          due_date: dueDate || null,
          assigned_to: userId,
          created_by: userId,
        },
        summary: `I'll create a task called "${title}"${dueDateStr} and assign it to you. Sound good?`,
      }
    },
    {
      name: 'createTaskForSelf',
      description: 'Create a new task that will be assigned to yourself.',
      schema: createTaskInputSchema,
    }
  )
}
