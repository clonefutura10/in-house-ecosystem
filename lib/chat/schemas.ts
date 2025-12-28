import { z } from 'zod'

// Tool schemas
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'review', 'done', 'blocked'])
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const dueDateFilterSchema = z.enum(['today', 'this_week', 'overdue', 'no_date'])

export const listTasksInputSchema = z.object({
  status: taskStatusSchema.optional().describe('Filter by task status'),
  priority: taskPrioritySchema.optional().describe('Filter by priority'),
  dueWithin: dueDateFilterSchema.optional().describe('Filter by due date: today, this_week, overdue, or no_date'),
})

export const getTaskDetailsInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to get details for'),
})

// Employee-friendly schemas that accept task names/titles instead of IDs
export const getTaskDetailsByIdentifierSchema = z.object({
  taskIdentifier: z.string().describe('The task title, name, or keywords to search for'),
})

export const updateTaskStatusInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to update'),
  status: taskStatusSchema.describe('The new status for the task'),
})

export const updateTaskStatusByIdentifierSchema = z.object({
  taskIdentifier: z.string().describe('The task title, name, or keywords to search for'),
  status: taskStatusSchema.describe('The new status for the task'),
})

export const searchMyTaskByTitleSchema = z.object({
  searchTerm: z.string().describe('Part of the task title or keywords to search for'),
})

export const createTaskInputSchema = z.object({
  title: z.string().describe('The title of the task'),
  description: z.string().optional().describe('Optional description of the task'),
  priority: taskPrioritySchema.default('medium').describe('Priority level'),
  dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
})

export const createTaskWithAssigneeSchema = createTaskInputSchema.extend({
  assignedTo: z.string().optional().describe('User ID to assign the task to'),
})

export const assignTaskInputSchema = z.object({
  taskIdentifier: z.string().describe('The task title, name, or ID to search for'),
  assignToName: z.string().describe('The name or email of the employee to assign the task to'),
})

export const listEmployeesInputSchema = z.object({
  department: z.string().optional().describe('Filter by department'),
})

export const deleteTaskInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to delete'),
})

export const updateTaskInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to update'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  priority: taskPrioritySchema.optional().describe('New priority'),
  dueDate: z.string().optional().describe('New due date'),
})

export const searchTaskByTitleSchema = z.object({
  searchTerm: z.string().describe('Part of the task title to search for'),
})

// Types
export type TaskStatus = z.infer<typeof taskStatusSchema>
export type TaskPriority = z.infer<typeof taskPrioritySchema>
export type ListTasksInput = z.infer<typeof listTasksInputSchema>
export type GetTaskDetailsInput = z.infer<typeof getTaskDetailsInputSchema>
export type GetTaskDetailsByIdentifier = z.infer<typeof getTaskDetailsByIdentifierSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInputSchema>
export type UpdateTaskStatusByIdentifier = z.infer<typeof updateTaskStatusByIdentifierSchema>
export type SearchMyTaskByTitle = z.infer<typeof searchMyTaskByTitleSchema>
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>
export type CreateTaskWithAssignee = z.infer<typeof createTaskWithAssigneeSchema>
export type AssignTaskInput = z.infer<typeof assignTaskInputSchema>
export type ListEmployeesInput = z.infer<typeof listEmployeesInputSchema>
export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>

// Approval action type
export interface PendingApproval {
  requiresApproval: true
  action: string
  data: Record<string, unknown>
  summary: string
}
