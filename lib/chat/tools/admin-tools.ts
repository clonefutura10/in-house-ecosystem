import { tool } from '@langchain/core/tools'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import {
  listTasksInputSchema,
  createTaskWithAssigneeSchema,
  assignTaskInputSchema,
  listEmployeesInputSchema,
  deleteTaskInputSchema,
  updateTaskInputSchema,
  searchTaskByTitleSchema,
  PendingApproval,
} from '../schemas'

type SupabaseClientType = SupabaseClient<Database>

// List all tasks (admin only)
export function createListAllTasksTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ status, priority }) => {
      let query = supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq('is_archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (status) {
        query = query.eq('status', status)
      }
      if (priority) {
        query = query.eq('priority', priority)
      }

      const { data: tasks, error } = await query.limit(25)

      if (error) {
        return `I had trouble getting the task list. Please try again.`
      }

      if (!tasks || tasks.length === 0) {
        return `There are no ${status ? status.replace('_', ' ') + ' ' : ''}tasks in the system.`
      }

      const taskList = tasks
        .map((t, i) => {
          const assignee = (t.assigned_to_profile as { full_name: string } | null)?.full_name || 'Unassigned'
          const dueStr = t.due_date
            ? `due ${new Date(t.due_date).toLocaleDateString()}`
            : 'no due date'
          return `${i + 1}. "${t.title}" - ${t.status?.replace('_', ' ')} | ${assignee} (${dueStr})`
        })
        .join('\n')

      return `Here are the tasks:\n\n${taskList}`
    },
    {
      name: 'listAllTasks',
      description: 'List all tasks in the system. Can filter by status or priority.',
      schema: listTasksInputSchema,
    }
  )
}

// Create task with optional assignee (admin only)
export function createCreateTaskTool(supabase: SupabaseClientType, userId: string) {
  return tool(
    async ({ title, description, priority, dueDate, assignedTo }): Promise<PendingApproval> => {
      let assigneeName = 'no one'

      if (assignedTo) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', assignedTo)
          .single()
        assigneeName = profile?.full_name || 'that person'
      }

      const dueDateStr = dueDate
        ? ` with a deadline of ${new Date(dueDate).toLocaleDateString()}`
        : ''

      return {
        requiresApproval: true,
        action: 'createTask',
        data: {
          title,
          description: description || null,
          priority,
          due_date: dueDate || null,
          assigned_to: assignedTo || null,
          created_by: userId,
        },
        summary: `I'll create "${title}"${dueDateStr} and assign it to ${assigneeName}. Want me to do that?`,
      }
    },
    {
      name: 'createTask',
      description: 'Create a new task, optionally assigning it to someone.',
      schema: createTaskWithAssigneeSchema,
    }
  )
}

// Assign task to someone (admin only) - resolves task title and user name to IDs
export function createAssignTaskTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ taskIdentifier, assignToName }): Promise<string | PendingApproval> => {
      // Search for task by title (partial match)
      const { data: foundTasks, error: taskError } = await supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${taskIdentifier}%`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (taskError) {
        console.error('[assignTask] Task search error:', taskError)
        return `I had trouble searching for tasks. Please try again.`
      }

      if (!foundTasks || foundTasks.length === 0) {
        return `I couldn't find a task matching "${taskIdentifier}". Could you give me the exact task name?`
      }

      // If multiple tasks match, ask for clarification
      if (foundTasks.length > 1) {
        const taskList = foundTasks.map((t, i) => `${i + 1}. "${t.title}"`).join('\n')
        return `I found multiple tasks matching "${taskIdentifier}":\n\n${taskList}\n\nWhich one do you want to assign?`
      }

      const task = foundTasks[0]

      // Try to find the user by name or email (case insensitive) - only employees
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${assignToName}%,email.ilike.%${assignToName}%`)
        .eq('status', 'active')
        .eq('role', 'employee')  // Only assign to employees
        .limit(5)

      if (userError || !users || users.length === 0) {
        return `I couldn't find an employee matching "${assignToName}". Could you check the name or email?`
      }

      // If multiple matches, ask for clarification
      if (users.length > 1) {
        const userList = users.map((u, i) => `${i + 1}. ${u.full_name} (${u.email})`).join('\n')
        return `I found multiple employees matching "${assignToName}":\n\n${userList}\n\nCould you please specify which one?`
      }

      const user = users[0]

      return {
        requiresApproval: true,
        action: 'assignTask',
        data: { taskId: task.id, assignTo: user.id },
        summary: `I'll assign "${task.title}" to ${user.full_name}. Is that okay?`,
      }
    },
    {
      name: 'assignTask',
      description: 'Assign a task to an employee. Use the task title/name and employee name or email.',
      schema: assignTaskInputSchema,
    }
  )
}

// List employees (admin only) - excludes admins
export function createListEmployeesTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ department }) => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, department, job_title')
        .eq('status', 'active')
        .eq('role', 'employee')  // Only show employees, not admins
        .order('full_name')

      if (department) {
        query = query.eq('department', department)
      }

      const { data: employees, error } = await query.limit(50)

      if (error) {
        return `I had trouble getting the employee list. Please try again.`
      }

      if (!employees || employees.length === 0) {
        return `No employees found${department ? ` in the ${department} department` : ''}.`
      }

      const employeeList = employees
        .map((e, i) => {
          const details = [e.job_title, e.department].filter(Boolean).join(', ')
          return `${i + 1}. ${e.full_name} - ${e.email}${details ? ` (${details})` : ''}`
        })
        .join('\n')

      return `Here are the employees:\n\n${employeeList}`
    },
    {
      name: 'listEmployees',
      description: 'List all active employees. Can filter by department.',
      schema: listEmployeesInputSchema,
    }
  )
}

// Delete/archive task (admin only)
export function createDeleteTaskTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ taskId }): Promise<string | PendingApproval> => {
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single()

      if (!task) {
        return `I couldn't find that task. Please check the task ID.`
      }

      return {
        requiresApproval: true,
        action: 'deleteTask',
        data: { taskId },
        summary: `I'll archive "${task.title}". This won't delete it permanently. Go ahead?`,
      }
    },
    {
      name: 'deleteTask',
      description: 'Archive a task (soft delete).',
      schema: deleteTaskInputSchema,
    }
  )
}

// Update task details (admin only)
export function createUpdateTaskTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ taskId, title, description, priority, dueDate }): Promise<string | PendingApproval> => {
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single()

      if (!task) {
        return `I couldn't find that task. Please check the task ID.`
      }

      const changes: string[] = []
      if (title) changes.push(`rename it to "${title}"`)
      if (description !== undefined) changes.push('update the description')
      if (priority) changes.push(`set priority to ${priority}`)
      if (dueDate) changes.push(`set due date to ${new Date(dueDate).toLocaleDateString()}`)

      if (changes.length === 0) {
        return `What would you like to change about this task? You can update the title, description, priority, or due date.`
      }

      return {
        requiresApproval: true,
        action: 'updateTask',
        data: { taskId, title, description, priority, due_date: dueDate },
        summary: `I'll ${changes.join(' and ')} for "${task.title}". Does that look right?`,
      }
    },
    {
      name: 'updateTask',
      description: 'Update task details like title, description, priority, or due date.',
      schema: updateTaskInputSchema,
    }
  )
}

// Search for a task by title (admin only) - helps find tasks mentioned in conversation
export function createSearchTaskByTitleTool(supabase: SupabaseClientType, _userId: string) {
  return tool(
    async ({ searchTerm }) => {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, due_date,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .ilike('title', `%${searchTerm}%`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('[searchTaskByTitle] Error:', error)
        return `I had trouble searching for tasks. Please try again.`
      }

      if (!tasks || tasks.length === 0) {
        return `I couldn't find any tasks matching "${searchTerm}".`
      }

      const taskList = tasks
        .map((t, i) => {
          const assignee = (t.assigned_to_profile as { full_name: string } | null)?.full_name || 'Unassigned'
          return `${i + 1}. "${t.title}" (ID: ${t.id}) - ${t.status?.replace('_', ' ')} | ${assignee}`
        })
        .join('\n')

      return `Found these tasks matching "${searchTerm}":\n\n${taskList}`
    },
    {
      name: 'searchTaskByTitle',
      description: 'Search for a task by its title. Use this to find a task when the user refers to it by name instead of ID.',
      schema: searchTaskByTitleSchema,
    }
  )
}
