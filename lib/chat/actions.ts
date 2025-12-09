import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { PendingApproval } from './schemas'

type SupabaseClientType = SupabaseClient<Database>

export interface ApprovalResponse {
  approved: boolean
  action: string
  data: Record<string, unknown>
}

/**
 * Execute an approved action
 */
export async function executeApprovedAction(
  supabase: SupabaseClientType,
  approval: ApprovalResponse
): Promise<string> {
  if (!approval.approved) {
    return `No problem, I've cancelled that action.`
  }

  const { action, data } = approval

  try {
    switch (action) {
      case 'createTask': {
        const { error } = await supabase.from('tasks').insert({
          title: data.title as string,
          description: data.description as string | null,
          priority: data.priority as 'low' | 'medium' | 'high' | 'urgent',
          due_date: data.due_date as string | null,
          assigned_to: data.assigned_to as string | null,
          created_by: data.created_by as string,
        })

        if (error) throw error
        return `Done! I've created the task "${data.title}".`
      }

      case 'updateTaskStatus': {
        const { error } = await supabase
          .from('tasks')
          .update({
            status: data.status as 'todo' | 'in_progress' | 'review' | 'done' | 'blocked',
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.taskId as string)

        if (error) throw error
        const statusDisplay = (data.status as string).replace('_', ' ')
        return `Done! The task is now marked as ${statusDisplay}.`
      }

      case 'updateTask': {
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (data.title) updateData.title = data.title
        if (data.description !== undefined) updateData.description = data.description
        if (data.priority) updateData.priority = data.priority
        if (data.due_date) updateData.due_date = data.due_date

        const { error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', data.taskId as string)

        if (error) throw error
        return `Done! I've updated the task.`
      }

      case 'assignTask': {
        const { error } = await supabase
          .from('tasks')
          .update({
            assigned_to: data.assignTo as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.taskId as string)

        if (error) throw error
        return `Done! The task has been assigned.`
      }

      case 'deleteTask': {
        const { error } = await supabase
          .from('tasks')
          .update({
            is_archived: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.taskId as string)

        if (error) throw error
        return `Done! The task has been archived.`
      }

      default:
        return `I don't know how to do that action. Please try again.`
    }
  } catch (error) {
    console.error('Error executing action:', error)
    return `Sorry, something went wrong. Please try again.`
  }
}

/**
 * Check if a tool response requires approval
 */
export function isPendingApproval(result: unknown): result is PendingApproval {
  return (
    typeof result === 'object' &&
    result !== null &&
    'requiresApproval' in result &&
    (result as PendingApproval).requiresApproval === true
  )
}
