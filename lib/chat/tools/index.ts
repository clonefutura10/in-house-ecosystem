import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import {
  createListMyTasksTool,
  createGetTaskDetailsTool,
  createUpdateTaskStatusTool,
  createCreateTaskForSelfTool,
} from './employee-tools'
import {
  createListAllTasksTool,
  createCreateTaskTool,
  createAssignTaskTool,
  createListEmployeesTool,
  createDeleteTaskTool,
  createUpdateTaskTool,
  createSearchTaskByTitleTool,
} from './admin-tools'

type SupabaseClientType = SupabaseClient<Database>

export function getToolsForRole(
  supabase: SupabaseClientType,
  role: 'admin' | 'employee',
  userId: string
) {
  // Employee tools - available to everyone
  const employeeTools = [
    createListMyTasksTool(supabase, userId),
    createGetTaskDetailsTool(supabase, userId),
    createUpdateTaskStatusTool(supabase, userId),
    createCreateTaskForSelfTool(supabase, userId),
  ]

  if (role === 'employee') {
    return employeeTools
  }

  // Admin gets employee tools + admin-only tools
  const adminTools = [
    ...employeeTools,
    createListAllTasksTool(supabase, userId),
    createCreateTaskTool(supabase, userId),
    createAssignTaskTool(supabase, userId),
    createListEmployeesTool(supabase, userId),
    createDeleteTaskTool(supabase, userId),
    createUpdateTaskTool(supabase, userId),
    createSearchTaskByTitleTool(supabase, userId),
  ]

  return adminTools
}

// Actions that require approval before execution
export const APPROVAL_REQUIRED_ACTIONS = [
  'createTask',
  'updateTask',
  'deleteTask',
  'assignTask',
  'updateTaskStatus',
]
