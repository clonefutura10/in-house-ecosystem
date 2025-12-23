# 🎯 In-House Ecosystem - Complete HR Demonstration Guide

**Prepared for:** HR Team Demonstration  
**Date:** December 17, 2025  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start - Running the Application](#2-quick-start---running-the-application)
3. [User Roles & Authentication](#3-user-roles--authentication)
4. [Admin Portal - Complete Feature Guide](#4-admin-portal---complete-feature-guide)
5. [Employee Portal - Complete Feature Guide](#5-employee-portal---complete-feature-guide)
6. [AI Chatbot Assistant](#6-ai-chatbot-assistant)
7. [Performance Management System](#7-performance-management-system)
8. [Testing Scenarios for Live Demo](#8-testing-scenarios-for-live-demo)
9. [Technical Architecture](#9-technical-architecture)

---

## 1. Project Overview

### What is In-House Ecosystem?

**In-House Ecosystem** is a comprehensive **internal employee management platform** that combines:

- ✅ **Task Management** - Create, assign, track, and complete tasks
- ✅ **Performance Management** - Auto-calculated performance scores, incentive tiers, and appraisals
- ✅ **AI-Powered Chatbot** - Natural language task management assistant
- ✅ **Team Management** - Employee directory with profiles
- ✅ **Notification System** - Birthday, anniversary, and deadline reminders
- ✅ **Reminder Templates** - Customizable email/notification templates

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Productivity** | Streamlined task tracking reduces manual work |
| **Transparency** | Real-time visibility into team performance |
| **Automation** | Auto-generated performance reports and reminders |
| **AI-Powered** | Natural language chatbot for quick actions |
| **Export Ready** | Performance data exportable for payroll |

---

## 2. Quick Start - Running the Application

### Step 1: Start the Development Server

```bash
cd /Users/khushi22/project2/in-house-ecosystem
npm run dev
```

### Step 2: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### Step 3: Login Credentials

| Role | Email | Purpose |
|------|-------|---------|
| **Admin** | (Your admin email) | Full access to all features |
| **Employee** | (Test employee email) | Limited to own tasks and profile |

---

## 3. User Roles & Authentication

### 3.1 Role-Based Access Control

The system has **two user roles** with different permissions:

#### 🔑 **Admin Role**
- View and manage ALL tasks across the organization
- Assign tasks to any employee
- Generate performance reports
- Create and manage reminder templates
- View all team members and their profiles
- Access performance dashboards
- Archive/restore tasks
- Configure automation settings

#### 👤 **Employee Role**
- View only tasks assigned to them
- Update status on their own tasks
- Create tasks for themselves
- View own profile and performance metrics
- Receive notifications and reminders

### 3.2 Authentication Flow

1. **Login Page** (`/login`) - Email and password authentication
2. **Sign Up Page** (`/signup`) - New user registration
3. **Session Management** - Secure session handled by Supabase Auth
4. **Auto-redirect** - Users redirected based on role after login

---

## 4. Admin Portal - Complete Feature Guide

### 4.1 Admin Dashboard (`/dashboard`)

When an admin logs in, they see the **Admin Dashboard** with:

#### 📊 **Stat Cards** (Top Section)
| Card | Description | Icon |
|------|-------------|------|
| **Total Employees** | Count of active employees in the system | 👥 Users |
| **Active Tasks** | Tasks that are not archived and not done | 📋 ListTodo |
| **Pending Reviews** | Tasks currently in "Review" status | ⏰ Clock |
| **Upcoming Deadlines** | Tasks due within the next 7 days | 📅 CalendarClock |

#### 📈 **This Month's Summary** (Middle Section)
- **Tasks Completed** - Number of tasks marked "Done" this month
- **Total Tasks** - All tasks created this month
- **Completion Rate** - Percentage calculated as (Completed / Total) × 100

#### 🕐 **Recent Task Activity** (Bottom Section)
Shows the 5 most recently updated tasks with:
- Task title
- Current status (In Progress, Done, Review, Blocked)
- Assignee name and avatar
- Time since last update (e.g., "2 hours ago")

---

### 4.2 Tasks Page (`/tasks`)

The main task management hub with full CRUD capabilities:

#### 🎛️ **Filter Toolbar**
- **Search** - Filter tasks by title
- **Status Filter** - Filter by: To Do, In Progress, Review, Done, Blocked
- **Priority Filter** - Filter by: Low, Medium, High, Urgent
- **View Toggle** - Switch between Active and Archived tasks

#### 📋 **Task Table Columns**
| Column | Description |
|--------|-------------|
| **Title** | Task name (clickable to open details) |
| **Status** | Visual badge showing current status |
| **Priority** | Color-coded priority badge |
| **Assignee** | Employee avatar + name |
| **Due Date** | Date with overdue highlighting |
| **Actions** | Edit, Archive, Restore buttons |

#### ✏️ **Task Operations (Admin Only)**
1. **Create New Task**
   - Click "+ New Task" button
   - Fill in: Title, Description, Priority, Due Date
   - Select assignee from employee dropdown
   - Submit to create

2. **Edit Task**
   - Click the edit icon on any task row
   - Modify any field
   - Save changes

3. **Assign/Reassign Task**
   - Open task edit dialog
   - Select new assignee from dropdown
   - Only active employees are shown

4. **Archive Task**
   - Click archive icon to soft-delete
   - Task moves to "Archived" tab
   - Can be restored anytime

5. **Restore Archived Task**
   - Switch to "Archived" view
   - Click restore button
   - Task returns to active list

---

### 4.3 Team Page (`/team`)

Employee directory for managing team information:

#### 👥 **Team Member Cards**
Each employee card shows:
- Profile picture (or generated avatar)
- Full name
- Job title
- Department
- Email address
- Status (Active/Inactive)

#### 📋 **Team List Features**
- Search by name or email
- Filter by department
- View detailed profile (click on card)

---

### 4.4 Performance Page (`/performance`) - Admin Only

The heart of the performance management system:

#### 📊 **Summary Statistics Cards**
| Card | Calculation | Description |
|------|-------------|-------------|
| **Total Employees** | Count of all employees | Number of team members |
| **Tasks Completed** | Tasks with status = 'done' | Finished work items |
| **In Progress** | Tasks with status = 'in_progress' | Ongoing work |
| **Overdue** | Due date < today AND status ≠ done | Late tasks |
| **Completion Rate** | (Completed / Total) × 100 | Overall efficiency |
| **Average Score** | Mean of all overall_score | Team average |

#### 📑 **Tabs**

**Tab 1: Performance Metrics**
- Sortable table of all employee performance data
- Columns: Employee, Department, Period, Tasks (done/assigned), Completion Rate, On-Time Rate, Overall Score, Incentive %
- **Generate Report** button to create new monthly reports
- **Export CSV** button for payroll data

**Tab 2: Appraisals**
- List of created appraisals
- Create new appraisal with slider-based ratings
- Categories: Productivity, Quality, Teamwork, Communication, Initiative
- Add manager comments, strengths, and improvement areas

**Tab 3: Team Overview**
- Visual cards for each employee
- Quick view of: Tasks done, Score percentage, Incentive tier

#### 🧮 **How Performance Scores Work**

```
Completion Rate = (Tasks Completed / Tasks Assigned) × 100
On-Time Rate = (Tasks On-Time / Tasks Completed) × 100
Overall Score = (Completion Rate × 0.6) + (On-Time Rate × 0.4)
```

**Incentive Tiers:**
| Score Range | Tier | Incentive % |
|-------------|------|-------------|
| 95 - 100 | 🌟 Exceptional | +20% |
| 85 - 94 | 🥇 Excellent | +15% |
| 75 - 84 | 🥈 Good | +10% |
| 60 - 74 | 🥉 Satisfactory | +5% |
| 0 - 59 | ⚠️ Needs Improvement | 0% |

**Weight Distribution:**
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Completion Rate | 60% | Completing tasks is the primary goal |
| On-Time Rate | 40% | Meeting deadlines is important but secondary |

---

### 4.4.1 Appraisal System - What Happens When You Create an Appraisal

The **Appraisal System** in the "Appraisals" tab allows admins/managers to provide structured performance reviews for employees.

#### 📝 **Creating an Appraisal - Step by Step**

1. **Open the Performance Page** → Go to the **"Appraisals"** tab
2. **Click "New Appraisal"** → Opens a dialog form
3. **Select Employee** → Choose from the dropdown of active employees
4. **Set Review Period** → Monthly or Quarterly
5. **Rate the Employee** on 5 categories using sliders (1-5 scale):

| Category | What It Measures |
|----------|------------------|
| **Productivity** | Work output, efficiency, meeting targets |
| **Quality** | Accuracy, attention to detail, error rate |
| **Teamwork** | Collaboration, helping colleagues, team spirit |
| **Communication** | Clarity, responsiveness, documentation |
| **Initiative** | Proactiveness, problem-solving, innovation |

6. **Add Written Feedback** (optional):
   - **Strengths** - What the employee does well
   - **Areas for Improvement** - What needs work
   - **Goals for Next Period** - Future targets
   - **Manager Comments** - General notes

7. **Submit** → Saves the appraisal

#### 🧮 **What Happens After Submission**

When you click "Submit", the system:

1. **Calculates Overall Score**:
   ```
   Overall Score = (Productivity + Quality + Teamwork + Communication + Initiative) / 5
   ```
   Example: (4 + 5 + 3 + 4 + 4) / 5 = **4.0 out of 5**

2. **Stores the Appraisal** in the `appraisals` table with:
   - All 5 category scores
   - Overall score (auto-calculated)
   - Written feedback (strengths, improvements, goals, comments)
   - Reviewer ID (the logged-in admin who created it)
   - Period information (Monthly/Quarterly + Year + Period Number)
   - `status = 'draft'` (not visible to employee yet)
   - `is_published = false`

3. **Unique Per Period**: If an appraisal already exists for the same employee + period + year, it **updates** the existing record instead of creating a duplicate.

#### 📤 **Publishing an Appraisal**

Appraisals start as **drafts** and must be published to make them visible to employees:

| Status | Badge Color | Employee Can See? |
|--------|-------------|-------------------|
| **Draft** | 🟡 Yellow | ❌ No |
| **Published** | 🟢 Green | ✅ Yes |

**How to Publish:**
1. Go to **Performance** → **Appraisals** tab
2. Find the appraisal with "Draft" badge
3. Click the **"Publish to Employee"** button (green button at bottom of card)
4. The button shows a loading spinner while publishing
5. Once published:
   - Badge changes from yellow "Draft" to green "Published"
   - Button disappears (already published)
   - Employee can now see it in their "My Performance" page

#### 👁️ **What Employees See After Publishing**

When an employee logs in and goes to Performance:
- They see the **"My Appraisals"** section
- Only **published** appraisals are visible
- For each appraisal, they can view:
  - All 5 category scores with visual ratings
  - Overall score (X/5)
  - Strengths written by manager
  - Areas for improvement
  - Goals for next period

#### 📊 **Appraisal Data Structure**

| Field | Description |
|-------|-------------|
| `user_id` | The employee being evaluated |
| `reviewer_id` | The admin who created it |
| `period` | monthly / quarterly / yearly |
| `period_year` | Year (e.g., 2025) |
| `period_number` | 1-12 for monthly, 1-4 for quarterly |
| `productivity_score` | 1-5 rating |
| `quality_score` | 1-5 rating |
| `teamwork_score` | 1-5 rating |
| `communication_score` | 1-5 rating |
| `initiative_score` | 1-5 rating |
| `overall_score` | Auto-calculated average of all 5 scores |
| `strengths` | Text feedback |
| `areas_for_improvement` | Text feedback |
| `goals_for_next_period` | Text feedback |
| `manager_comments` | Text feedback |
| `is_published` | Boolean - controls employee visibility |

#### 🔒 **Security & Permissions**

- **Only admins** can create, edit, and publish appraisals
- **Employees** can only view their own published appraisals
- Enforced by Row Level Security (RLS) policies in the database

---

### 4.5 Templates Page (`/templates`)

Manage notification templates for automated messages:

#### 📝 **Template Types**
- **Birthday Wishes** - Sent on employee birthdays
- **Work Anniversary** - Sent on work anniversaries
- **Task Deadline** - Reminder for upcoming due dates
- **Custom Events** - Admin-created reminders

#### ✏️ **Template Editor**
- Subject line (for emails)
- Body template with **template variables**:
  - `{{name}}` - Employee's full name
  - `{{date}}` - Relevant date
  - `{{task_title}}` - Task name (for deadline reminders)
- Preview mode to see rendered template

---

### 4.6 Notifications Page (`/notifications`)

View all system notifications:

#### 📊 **Notification Stats**
- Total notifications
- Pending notifications
- Sent notifications
- Failed notifications

#### 📋 **Notification List**
| Column | Description |
|--------|-------------|
| **Title** | Notification subject |
| **Recipient** | Who received it |
| **Channel** | System, Email, Slack, WhatsApp |
| **Status** | Pending, Sent, Failed |
| **Created** | Timestamp |

#### 🔍 **Filters**
- Filter by status
- Filter by channel
- Search by content

---

### 4.7 Settings Page (`/settings`)

Configure automation and preferences:

#### ⚙️ **Automation Rules**
- View active automation jobs (birthday check, anniversary check, deadline reminders)
- Toggle automation on/off
- Edit cron schedule (time picker for when reminders run)
- Link templates to automation rules

#### ✉️ **Email Composer**
- Compose and send emails to employees
- Select recipients from dropdown
- Use templates or write custom messages

---

## 5. Employee Portal - Complete Feature Guide

### 5.1 Employee Dashboard (`/dashboard`)

A personalized view for each employee:

#### 👋 **Welcome Header**
"Hello, [First Name]. You have [X] tasks due today."

#### 📊 **Stat Cards** (4 cards)
| Card | Description |
|------|-------------|
| **Completed This Month** | Tasks you finished this month |
| **Pending Reviews** | Your tasks awaiting review |
| **Due Today** | Tasks due by end of day |
| **Total Active Tasks** | All your non-archived tasks |

#### 🔥 **High Priority Tasks**
- Shows top 5 urgent/high priority tasks
- Displays: Title, Due Date, Status
- Overdue dates shown in red
- Click any task to go to Tasks page

#### 📈 **This Month's Progress**
- Large number showing tasks completed
- Task status overview sidebar

#### 🔗 **Quick Actions**
- "View All Tasks" button to navigate to Tasks page

---

### 5.2 Tasks Page - Employee View (`/tasks`)

Limited task management for employees:

#### 👁️ **What Employees See**
- **Only their assigned tasks** (not all tasks)
- Cannot see unassigned tasks
- Cannot see other employees' tasks

#### ✅ **What Employees Can Do**
1. **Update Task Status**
   - Move from: To Do → In Progress → Review → Done
   - Cannot change priority or due date
   - Cannot reassign to others

2. **Create Task for Self**
   - Create personal tasks assigned to themselves
   - Set title, description, priority, due date

3. **View Task Details**
   - Click on task to see full description
   - View attachments and comments

#### ❌ **What Employees Cannot Do**
- Assign tasks to others
- Archive/delete tasks
- Edit task details (title, description, priority)
- View team-wide task list

---

### 5.3 My Performance Page (`/performance`) - Employee View

Employees can access their own performance data and appraisals:

#### 📊 **My Performance Summary Card**
Shows the employee's current month metrics:
- **Tasks Completed** - Number completed out of assigned
- **Completion Rate** - Percentage with progress bar
- **On-Time Rate** - Percentage with progress bar
- **Overall Score** - Calculated score with performance badge
- **Quality Rating** - Star rating (1-5)
- **Attendance** - Attendance percentage
- **Incentive Earned** - If eligible, shows bonus percentage (e.g., +15%)

#### 📝 **My Appraisals Section**
Shows published appraisals from managers:
- **Period** - Monthly/Quarterly - Year (e.g., "monthly Review - 2025")
- **Published Badge** - Green badge indicating it's viewable
- **Category Scores** (1-5 scale):
  - Productivity
  - Quality
  - Teamwork
  - Communication
  - Initiative
- **Overall Score** - Average of all 5 categories
- **Strengths** - Manager's positive feedback
- **Areas for Improvement** - Constructive feedback

#### 📋 **What Employees See vs Don't See**
| Can See ✅ | Cannot See ❌ |
|-----------|--------------|
| Own performance metrics | Other employees' metrics |
| Published appraisals only | Draft appraisals |
| Own scores and incentives | Team-wide performance |
| Manager feedback | Who else was evaluated |

---

### 5.4 Profile Page (`/profile`)

Personal profile management:

#### 📋 **Profile Information**
- Full name
- Email (read-only)
- Job title
- Department
- Date of birth
- Work anniversary
- Avatar/profile picture

#### ✏️ **Editable Fields**
Employees can update:
- Full name
- Profile picture
- Personal contact information

---

## 6. AI Chatbot Assistant

### 6.1 Overview

The **AI Assistant** is a GPT-powered chatbot that helps users manage tasks through natural language conversation.

**How to Access:**
- Click the **floating action button** (💬) in the bottom-right corner
- A slide-out drawer opens with the chat interface

### 6.2 Employee Chatbot Capabilities

Employees can ask the chatbot to:

| Action | Example Prompts |
|--------|-----------------|
| **List My Tasks** | "What are my tasks?", "Show my to-do list" |
| **Filter by Status** | "Show my in-progress tasks" |
| **Filter by Due Date** | "Tasks due this week?", "What's due today?" |
| **Get Task Details** | "Tell me about the project proposal task" |
| **Update Status** | "Mark task X as done", "Move proposal to in progress" |
| **Create Task** | "Create a task for me called 'Write report'" |

**Employee Tools Available:**
1. `listMyTasks` - Shows tasks assigned to you
2. `getTaskDetails` - Get details about a specific task
3. `updateTaskStatus` - Change task status (requires approval)
4. `createTaskForSelf` - Create a task for yourself (requires approval)

### 6.3 Admin Chatbot Capabilities

Admins have additional powers:

| Action | Example Prompts |
|--------|-----------------|
| **List All Tasks** | "Show all tasks", "What's everyone working on?" |
| **Assign Tasks** | "Assign the proposal task to John" |
| **Create for Others** | "Create a task for Sarah: Review documents" |
| **List Employees** | "Who's on the team?", "List all employees" |
| **Update Any Task** | "Change priority of task X to high" |
| **Delete/Archive** | "Archive the old meeting task" |
| **Search Tasks** | "Find tasks about marketing" |

**Admin Tools Available:**
1. `listAllTasks` - View all tasks in system
2. `listMyTasks` - View admin's own tasks
3. `createTask` - Create task for anyone
4. `assignTask` - Assign/reassign tasks
5. `searchTaskByTitle` - Find tasks by name
6. `listEmployees` - View employee directory
7. `updateTask` - Modify task details
8. `deleteTask` - Archive tasks

### 6.4 Approval System

For any **write operations** (create, update, delete), the chatbot asks for confirmation:

```
Chatbot: I'll create "Weekly Report" and assign it to John Smith with a 
         deadline of December 20th. Want me to do that?

         [✓ Confirm]  [✗ Cancel]
```

- Click **Confirm** to execute the action
- Click **Cancel** to abort
- This prevents accidental changes

### 6.5 Chat Features

- **Message History** - Previous messages preserved during session
- **Clear Conversation** - Reset button to start fresh
- **Quick Actions** - Preset buttons for common queries
- **Error Handling** - Graceful error messages
- **Loading States** - Spinner while processing

---

## 7. Performance Management System

### 7.1 How Reports Are Generated

1. Admin clicks **"Generate Report"** on Performance page
2. System calls `generate_monthly_performance()` database function
3. For each active employee, it calculates:
   - Tasks assigned this period
   - Tasks completed this period
   - Tasks completed on-time
   - Overdue tasks
4. Scores are calculated using weighted formula
5. Incentive tier is assigned based on score
6. Results stored in `performance_metrics` table
7. Dashboard refreshes to show new data

### 7.2 Data Flow Diagram

```
┌─────────────────┐
│  Tasks Table    │
│  (task data)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculate:     │
│  - Completion   │
│  - On-Time      │
│  - Overdue      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Apply Formula: │
│  Score = 0.6×CR │
│        + 0.4×OT │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Assign Tier:   │
│  Based on Score │
│  (0-59, 60-74,  │
│   75-84, etc.)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in:      │
│  performance_   │
│  metrics table  │
└─────────────────┘
```

### 7.3 Export for Payroll

Click **"Export CSV"** to download data containing:
- Employee name
- Department
- Period (Month/Year)
- Tasks completed/assigned
- Completion rate
- On-time rate
- Overall score
- **Incentive percentage** ← For payroll calculation

---

## 8. Testing Scenarios for Live Demo

### Scenario 1: Admin Creates and Assigns a Task

**Steps:**
1. Login as Admin
2. Go to Tasks page
3. Click "+ New Task"
4. Enter: Title = "Q4 Sales Report", Priority = High, Due = 3 days from now
5. Assign to an employee
6. Click Create
7. **Verify:** Task appears in list, employee can see it

### Scenario 2: Employee Updates Task Status

**Steps:**
1. Login as Employee
2. Go to Dashboard - see stat cards
3. Go to Tasks page - see assigned tasks only
4. Click on a task
5. Change status from "To Do" to "In Progress"
6. **Verify:** Status updates, dashboard refreshes

### Scenario 3: Use Chatbot to Create Task

**Steps:**
1. Click chat button (💬)
2. Type: "Create a task called 'Prepare presentation' due Friday"
3. Chatbot asks for confirmation
4. Click Confirm
5. **Verify:** Task appears in task list

### Scenario 4: Generate Performance Report

**Steps:**
1. Login as Admin
2. Ensure some tasks are marked "Done"
3. Go to Performance page
4. Click "Generate Report"
5. **Verify:** Table shows calculated metrics for all employees

### Scenario 5: Export Performance Data

**Steps:**
1. On Performance page
2. Click "Export CSV"
3. **Verify:** CSV file downloads with all performance data

### Scenario 6: Chatbot Task Query

**Steps:**
1. Open chatbot
2. Type: "What tasks are due this week?"
3. **Verify:** Chatbot returns list of tasks with due dates

### Scenario 7: Verify Role-Based Access

**Steps:**
1. Login as Employee
2. Try to access `/performance` page
3. **Verify:** Redirected or limited view (employee can only see own metrics)
4. Login as Admin
5. Access same page
6. **Verify:** Full access to all employee data

---

## 9. Technical Architecture

### 9.1 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18 |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Backend** | Supabase (PostgreSQL, Auth, Real-time) |
| **AI/Chatbot** | LangChain.js + OpenAI GPT-4 |
| **Authentication** | Supabase Auth |
| **Database** | PostgreSQL with RLS |

### 9.2 Key Database Tables

```sql
profiles        -- User profiles extending Supabase auth
tasks           -- Task data with status, priority, assignee
task_comments   -- Comments on tasks
performance_metrics -- Auto-calculated performance data
appraisals      -- Manager evaluations
notifications   -- System notifications
reminder_templates -- Email/notification templates
automation_configs -- Cron job configurations
chat_sessions   -- Chatbot conversation history
chat_messages   -- Individual chat messages
```

### 9.3 Security Model

- **Row-Level Security (RLS)** on all tables
- Employees can only access their own data
- Admins have elevated access through RLS policies
- API routes protected by authentication middleware

### 9.4 Folder Structure

```
/app
  /(auth)         -- Login, signup pages
  /(dashboard)    -- Main app pages (dashboard, tasks, team, etc.)
  /api            -- API routes
  
/components
  /features       -- Feature-specific components (chat, tasks, performance)
  /layout         -- Layout components (sidebar, header)
  /ui             -- Reusable UI components (buttons, cards, etc.)
  
/lib
  /chat           -- Chatbot logic, LangChain tools
  /supabase       -- Database client configuration
  /validations    -- Form validation schemas
  
/docs             -- Documentation files
/supabase         -- Database migrations and functions
```

---

## 📌 Quick Reference - Demo Checklist

Before your demonstration, verify:

- [ ] Application is running (`npm run dev`)
- [ ] Admin account is accessible
- [ ] At least one employee account exists
- [ ] Some tasks exist with various statuses
- [ ] Performance data has been generated
- [ ] Chatbot is responding (OpenAI API key configured)

### Demo Flow Suggestion

1. **Start with Dashboard** (2 min) - Show overview stats
2. **Tasks Management** (5 min) - Create, assign, update tasks
3. **Employee View** (3 min) - Switch to employee, show limited access
4. **Chatbot Demo** (5 min) - Natural language task management
5. **Performance Reports** (5 min) - Generate report, show calculations
6. **Export Feature** (1 min) - Download CSV
7. **Q&A** (5 min)

---

## 🎉 Conclusion

The **In-House Ecosystem** provides a modern, AI-enhanced platform for:
- Efficient task management
- Transparent performance tracking
- Automated reminders and notifications
- Natural language interaction through AI chatbot

This system streamlines HR workflows and provides data-driven insights for performance-based incentives.

---

*Document prepared for HR demonstration purposes. For technical documentation, see other files in the /docs folder.*
