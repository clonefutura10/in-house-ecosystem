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

// List tasks assigned to current user
export function createListMyTasksTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ status, priority }) => {
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

      const { data: tasks, error } = await query.limit(20)

      if (error) {
        return `I had trouble getting your tasks. Please try again.`
      }

      if (!tasks || tasks.length === 0) {
        return `You don't have any ${status ? status.replace('_', ' ') + ' ' : ''}tasks right now.`
      }

      const taskList = tasks
        .map((t, i) => {
          const dueStr = t.due_date
            ? `due ${new Date(t.due_date).toLocaleDateString()}`
            : 'no due date'
          return `${i + 1}. "${t.title}" - ${t.status?.replace('_', ' ')} (${t.priority}, ${dueStr})`
        })
        .join('\n')

      return `Here are your tasks:\n\n${taskList}`
    },
    {
      name: 'listMyTasks',
      description: 'List tasks assigned to you. Can filter by status or priority.',
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
