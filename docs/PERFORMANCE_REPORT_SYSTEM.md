# Performance Report Generation System

This document explains how the Performance Management System generates reports, calculates metrics, and determines incentives.

---

## 📊 Overview

The Performance Report Generation system automatically calculates employee performance metrics based on their **task completion data**. Reports are generated on-demand by administrators and stored in the `performance_metrics` table.

---

## 🔄 Report Generation Flow

```
┌─────────────────────────┐
│  Admin clicks           │
│  "Generate Report"      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  generate_monthly_      │
│  performance() RPC      │
│  is called              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  For each ACTIVE        │
│  EMPLOYEE, calculate:   │
│  - Tasks assigned       │
│  - Tasks completed      │
│  - On-time completion   │
│  - Overdue tasks        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Calculate scores:      │
│  - Completion Rate      │
│  - On-Time Rate         │
│  - Overall Score        │
│  - Incentive %          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Store in               │
│  performance_metrics    │
│  table                  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display on Performance │
│  Dashboard              │
└─────────────────────────┘
```

---

## 📈 Metrics Calculation

### 1. Tasks Assigned
```sql
-- Count tasks assigned to employee within the period
SELECT COUNT(*) 
FROM tasks 
WHERE assigned_to = employee_id
  AND created_at >= period_start
  AND created_at <= period_end
```

### 2. Tasks Completed
```sql
-- Count tasks completed (status = 'done') within the period
SELECT COUNT(*) 
FROM tasks 
WHERE assigned_to = employee_id
  AND status = 'done'
  AND updated_at >= period_start
  AND updated_at <= period_end
```

### 3. Tasks Completed On-Time
```sql
-- Count tasks completed before or on the due date
SELECT COUNT(*) 
FROM tasks 
WHERE assigned_to = employee_id
  AND status = 'done'
  AND updated_at <= due_date  -- Completed before deadline
  AND updated_at >= period_start
  AND updated_at <= period_end
```

### 4. Overdue Tasks
```sql
-- Count tasks that are NOT done and past due date
SELECT COUNT(*) 
FROM tasks 
WHERE assigned_to = employee_id
  AND status != 'done'
  AND due_date < CURRENT_DATE
  AND is_archived = false
```

---

## 🧮 Score Calculation Formulas

### Completion Rate
```
Completion Rate = (Tasks Completed / Tasks Assigned) × 100

Example:
- Tasks Assigned: 10
- Tasks Completed: 8
- Completion Rate = (8/10) × 100 = 80%
```

### On-Time Rate
```
On-Time Rate = (Tasks On-Time / Tasks Completed) × 100

Example:
- Tasks Completed: 8
- Tasks On-Time: 6
- On-Time Rate = (6/8) × 100 = 75%
```

### Overall Score
```
Overall Score = (Completion Rate × 0.6) + (On-Time Rate × 0.4)

Example:
- Completion Rate: 80%
- On-Time Rate: 75%
- Overall Score = (80 × 0.6) + (75 × 0.4)
                = 48 + 30
                = 78
```

**Weight Distribution:**
| Metric | Weight | Rationale |
|--------|--------|-----------|
| Completion Rate | 60% | Completing tasks is the primary goal |
| On-Time Rate | 40% | Meeting deadlines is important but secondary |

---

## 🏆 Incentive Tiers

Based on the Overall Score, employees qualify for different incentive percentages:

| Overall Score | Performance Tier | Incentive % |
|---------------|------------------|-------------|
| 95 - 100 | 🌟 Exceptional | +20% |
| 85 - 94 | 🥇 Excellent | +15% |
| 75 - 84 | 🥈 Good | +10% |
| 60 - 74 | 🥉 Satisfactory | +5% |
| 0 - 59 | ⚠️ Needs Improvement | 0% |

### Example Incentive Calculation
```
Employee: John Smith
Monthly Salary: ₹50,000
Overall Score: 88 (Excellent tier)
Incentive: 15%

Bonus Amount = ₹50,000 × 0.15 = ₹7,500
```

---

## 📅 Period Definitions

Reports are generated for specific periods:

### Monthly Period
```
Period Start: First day of the month
Period End: Last day of the month

Example for December 2025:
- Period Start: 2025-12-01
- Period End: 2025-12-31
```

### Quarterly Period
```
Q1: January 1 - March 31
Q2: April 1 - June 30
Q3: July 1 - September 30
Q4: October 1 - December 31
```

---

## 🗄️ Database Schema

### performance_metrics Table
```sql
CREATE TABLE performance_metrics (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),  -- Employee being evaluated
    period_start date,                      -- Start of evaluation period
    period_end date,                        -- End of evaluation period
    
    -- Task Metrics (auto-calculated)
    tasks_assigned int,
    tasks_completed int,
    tasks_on_time int,
    tasks_overdue int,
    
    -- Calculated Rates
    completion_rate float,    -- Percentage (0-100)
    on_time_rate float,       -- Percentage (0-100)
    overall_score float,      -- Weighted score (0-100)
    
    -- Incentive
    incentive_percentage float,  -- Based on tier (0, 5, 10, 15, 20)
    bonus_amount decimal,        -- Calculated bonus
    
    -- Additional Metrics (manual input)
    attendance_rate float,
    quality_rating float,     -- 1-5 scale
    
    -- Manager Review
    manager_notes text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    
    created_at timestamptz,
    updated_at timestamptz
);
```

---

## 🔧 PostgreSQL Functions

### 1. calculate_performance_metrics()
Calculates metrics for a single employee.

**Parameters:**
- `p_user_id`: Employee's UUID
- `p_period_start`: Start date
- `p_period_end`: End date

**Returns:** JSONB with all metrics

### 2. generate_monthly_performance()
Generates reports for ALL active employees for a given month.

**Parameters:**
- `p_year`: Year (default: current year)
- `p_month`: Month (default: current month)

**Returns:** 
```json
{
    "success": true,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31",
    "employees_processed": 5
}
```

**Access:** Admin only (checks `role = 'admin'`)

---

## 🖥️ UI Components

### Performance Page Features

1. **Summary Cards**
   - Total Employees
   - Completed Tasks
   - In Progress Tasks
   - Overdue Tasks
   - Overall Completion Rate
   - Average Score

2. **Performance Metrics Tab**
   - Sortable table of all employee metrics
   - Filter by period (Current Month, Last Month, Quarter)
   - Search by employee name/department

3. **Appraisals Tab**
   - View created appraisals
   - Create new appraisals with slider-based ratings

4. **Team Overview Tab**
   - Visual cards for each employee
   - Quick view of tasks done, score, and incentive

5. **Export CSV**
   - Download performance data for HR/payroll

---

## 📋 How to Generate a Report

### Step 1: Access Performance Page
Navigate to `/performance` in the sidebar (Admin only)

### Step 2: Click "Generate Report"
This triggers the `generate_monthly_performance()` function

### Step 3: View Results
The table refreshes automatically showing:
- Employee name and department
- Period (e.g., "Dec 2025")
- Tasks completed vs assigned
- Completion rate with progress bar
- On-time rate with progress bar
- Overall score badge (color-coded)
- Incentive percentage

### Step 4: Export for Payroll
Click "Export CSV" to download the data

---

## 🔐 Security & Access Control

### Row Level Security (RLS)

**Admins:**
- Can view all employee metrics
- Can generate reports
- Can create/edit appraisals
- Can export data

**Employees:**
- Can view only their own metrics
- Cannot generate reports
- Can view published appraisals only

---

## 📝 Example Report Output

| Employee | Department | Period | Tasks | Completion | On-Time | Score | Incentive |
|----------|------------|--------|-------|------------|---------|-------|-----------|
| John Smith | Engineering | Dec 2025 | 8/10 | 80% | 75% | 78 | +10% |
| Jane Doe | Marketing | Dec 2025 | 10/10 | 100% | 100% | 100 | +20% |
| Bob Wilson | Sales | Dec 2025 | 5/8 | 62.5% | 80% | 69.5 | +5% |

---

## 🚀 Future Enhancements

1. **Quality Ratings**: Allow managers to rate task quality (1-5)
2. **Attendance Integration**: Sync with HR attendance system
3. **Quarterly Bonuses**: Auto-calculate quarterly incentives
4. **Performance Trends**: Charts showing performance over time
5. **Goal Setting**: Set and track individual performance goals
6. **Peer Reviews**: 360-degree feedback system

---

## 📖 Related Documentation

- [Database Schema](/docs/DATABASE_SCHEMA.md)
- [Testing Guide](/docs/TESTING_GUIDE.md)
- [RAW Project Description](/docs/RAW_PROJECT_DESCRIPTION.md)
