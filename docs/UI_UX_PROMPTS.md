# UI/UX Prompts for AI Design Agent

This document contains detailed prompts to generate the UI/UX for the "In-House Ecosystem" project. The design aesthetic is **Minimal Professional**—clean lines, generous whitespace, highly legible typography (Inter/SF Pro), and a neutral color palette (slate/gray/zinc) with subtle accent colors for status indicators.

---

## 1. Authentication

### 1.1 Login Page
**Prompt:**
> Design a minimalist Login page for a professional internal dashboard.
> *   **Layout**: A centered white card on a subtle gray-50 background.
> *   **Content**: "Welcome Back" header, email input, password input, "Forgot Password?" link, and a primary "Sign In" button (black background, white text).
> *   **Style**: Clean borders (gray-200), rounded corners (radius-md), and spacious padding (p-8). Input fields should have a gray-50 background that turns white with a black border on focus.
> *   **Vibe**: Secure, corporate, and distraction-free.

---

## 2. Layout & Navigation

### 2.1 App Layout (Shell)
**Prompt:**
> Design the main application shell with a responsive sidebar navigation.
> *   **Sidebar**: Fixed width (w-64) with a white background and a subtle gray-200 right border.
> *   **Navigation Items**:
>     *   Dashboard (Home icon)
>     *   My Tasks (CheckCircle icon)
>     *   Team/Users (Users icon - Admin only)
>     *   Performance (BarChart icon - Admin only)
>     *   Reminders (Bell icon)
>     *   Settings (Cog icon)
> *   **User Profile**: A small section at the bottom of the sidebar with the user's avatar, name, and a "Log Out" button.
> *   **Main Content Area**: White background, breadcrumbs at the top, clear page title (text-2xl font-semibold).

---

## 3. Dashboards

### 3.1 Admin Dashboard
**Prompt:**
> Design a "Command Center" style Admin Dashboard.
> *   **Header**: "Good Morning, [Name]".
> *   **Stats Grid**: 4 columns. Cards showing "Total Employees", "Active Tasks", "Pending Approvals", "Upcoming Deadlines". Use subtle icons and big numbers (text-3xl).
> *   **Charts Section**: A split view (grid-cols-2).
>     *   Left: "Task Completion Rate" (Line chart with a single smooth black line).
>     *   Right: "Department Performance" (Bar chart with gray bars, current month highlighted in black).
> *   **Recent Activity**: A list widget showing recent logins or task updates. Minimalist list items with timestamps.

### 3.2 Employee Dashboard
**Prompt:**
> Design a focused "My Work" dashboard for employees.
> *   **Focus**: Immediate action items.
> *   **Greeting**: "Hello, [Name]. You have 5 tasks due today."
> *   **Priority List**: A prominent list of "High Priority" tasks. Each row shows Title, Due Date (highlighted red if overdue), and Status badge.
> *   **Quick Actions**: A large, clickable card for "Create New Task" with a plus icon.
> *   **Stats**: Simple indicators for "My Tasks Completed This Month" and "Pending Reviews".

---

## 4. Task Management

### 4.1 Task List View
**Prompt:**
> Design a comprehensive Task List page.
> *   **Controls**: Filter bar at the top (Assignee, Status, Priority, Due Date). A segmented control to switch between "List View" and "Kanban Board".
> *   **Data Table**: Minimalist table headers (text-xs uppercase text-gray-500).
>     *   Columns: Status (dot indicator), Task Name, Priority (Badge), Assignee (Avatar stack), Due Date, Actions (Meatball menu).
> *   **Style**: Hover effects on rows (bg-gray-50). Status badges use a subtle pastel background (e.g., green-100 for Done, yellow-100 for In Progress) with dark text.

### 4.2 Task Details View
**Prompt:**
> Design a Task Details slide-over panel that enters from the right.
> *   **Header**: Large Task Title, Breadcrumbs, and Action buttons (Edit, Archive, Mark Complete).
> *   **Main Layout**: Two vertical columns.
> *   **Left Column (Content)**: Description (Rich text style), Subtasks checklist, Attachments grid (file icons).
> *   **Right Column (Meta)**: Status dropdown, Assignee selector, Priority selector, Due Date picker, Tags input.
> *   **Comments Section**: At the bottom of the left column. A timeline view of comments. "Write a comment..." text area with a "Send" button.

### 4.3 Create Task Modal
**Prompt:**
> Design a clean, focused "Create Task" modal.
> *   **Layout**: Centered modal, medium width (max-w-md).
> *   **Fields**: Title (single line), Description (multiline text area), Assignee (combobox), Priority (segmented control: Low, Medium, High), Due Date (calendar popover).
> *   **Footer**: "Cancel" (ghost button) and "Create Task" (primary black button).

---

## 5. Administration

### 5.1 User Directory
**Prompt:**
> Design of an Employee Directory table for Admins.
> *   **Header**: Search bar, "Add Employee" button.
> *   **Table**: Avatar, Name + Email (stacked), Job Title, Department, Role badge (Admin/Employee), Status badge (Active/Inactive).
> *   **Actions**: Edit icon, Deactivate icon.

### 5.2 Reminders Configuration
**Prompt:**
> Design a settings page for "Automated Reminders".
> *   **Layout**: A list of "Automation Rules".
> *   **Card Item**: Each rule (e.g., "Birthday Wishes") is a card.
>     *   Content: Toggle switch (On/Off), Rule Name, Schedule (e.g., "Daily at 9:00 AM").
>     *   Edit Mode: Clicking edits the template.
> *   **Template Editor**: A simple interface to edit the email subject and body. Show available variables like `{{name}}` in a sidebar helper.

---

## 6. Chatbot

### 6.1 Chat Interface
**Prompt:**
> Design an AI Assistant slide-out drawer.
> *   **Access**: A floating action button (FAB) in the bottom right corner with a sparkle icon.
> *   **Drawer Header**: "AI Assistant", Close button.
> *   **Chat Area**:
>     *   **Messages**: distinct bubbles. Gray-100 for AI, Black for User.
>     *   **Input**: Fixed at the bottom. Text input, "Send" icon, and a "Attach Context" button.
> *   **Suggested Prompts**: "Show my pending tasks", "Draft a summary of today's work". Rounded pill buttons above the input.
