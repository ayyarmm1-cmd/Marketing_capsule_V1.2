# Reports Module - Complete Documentation

## Overview

The Reports Module provides comprehensive analytics and insights across all major business functions. All reports support date filtering, data visualization, and CSV export capabilities.

## Available Reports

### 1. My Activity Summary
**Permission:** Available to all users  
**Description:** Personal activity overview showing your leads, tasks, and sales performance.

**Features:**
- Leads assigned to you
- Open leads count
- Tasks assigned to you
- Open tasks count
- Sales records where you're in charge
- Total sales amount

**Export:** CSV download available

---

### 2. Leads Report
**Permission:** `VIEW_LEADS`  
**Description:** Comprehensive lead pipeline analysis with conversion tracking.

**Features:**
- **Date Filtering:** Filter by date range with presets (This Month, Last 3 Months, Last 6 Months, This Year)
- **Key Metrics:**
  - Total leads
  - Open leads
  - Closed (Won)
  - Conversion rate
- **Visualizations:**
  - Bar chart showing leads by status
- **Export:** CSV download (summary + status breakdown)

**Data Sources:**
- All leads (if `VIEW_ALL_LEADS` permission)
- Only your assigned leads (if limited permission)

---

### 3. Sales Report
**Permission:** `VIEW_SALES_RECORDS`  
**Description:** Sales performance tracking and revenue analysis.

**Features:**
- **Date Filtering:** Filter by date range with presets
- **Key Metrics:**
  - Total sales records
  - Total sales amount
  - Average sale value
- **Visualizations:**
  - Bar chart showing sales by service type (Facebook Ads, Other Services)
- **Export:** CSV download (summary + service type breakdown)

**Data Sources:**
- All sales (if `VIEW_ALL_SALES_RECORDS` permission)
- Only your sales (if limited permission)

---

### 4. Tasks Report
**Permission:** `VIEW_TASKS`  
**Description:** Task management analytics with status and priority breakdowns.

**Features:**
- **Date Filtering:** Filter by date range with presets
- **Key Metrics:**
  - Total tasks
  - To Do tasks
  - Completed tasks
  - Overdue tasks (highlighted in red if > 0)
- **Visualizations:**
  - Pie chart: Tasks by status (To Do, In Progress, Completed)
  - Pie chart: Tasks by priority (Low, Medium, High)
- **Export:** CSV download (summary + status + priority breakdowns)

**Data Sources:**
- All tasks (if `VIEW_ALL_TASKS` permission)
- Only your assigned/created tasks (if limited permission)

---

### 5. Expense Report
**Permission:** `MANAGE_EXPENSES`  
**Description:** Detailed expense tracking with category filtering.

**Features:**
- **Category Filtering:** Filter expenses by category
- **Key Metrics:**
  - Total expenses (filtered)
  - Number of expenses (filtered)
- **Data Table:**
  - Date, Category, Description, Amount, Recorded By
- **Export:** CSV download with all expense details

**Data Sources:**
- All expenses from the system

---

### 6. Company Financial Report
**Permission:** `VIEW_FINANCE_DASHBOARD`  
**Description:** 360° view of company financial performance.

**Features:**
- **Date Filtering:** Custom date range with presets
- **Key Metrics:**
  - Total Revenue (Client Services + Training Center)
  - Total Expenses (General + VISA Reloads + Payroll)
  - Profit/Loss
- **Breakdown:**
  - Client Services Revenue
  - Training Center Revenue
  - General Expenses
  - VISA Card Reloads
  - Payroll
- **Export:** CSV download with complete financial breakdown

**Data Sources:**
- Client payments
- Student payments
- Expenses
- VISA reloads
- Payroll totals

---

### 7. Training Center Report
**Permission:** `VIEW_TRAINING_CENTER`  
**Description:** Training center analytics including enrollment and revenue.

**Features:**
- **Date Filtering:** Custom date range
- **Key Metrics:**
  - New student registrations
  - Total revenue
  - Batches started
  - Average revenue per new student
- **Visualizations:**
  - Horizontal bar chart: Revenue by course
  - Top 5 courses by revenue table
  - Revenue by payment method table
- **Export:** CSV download (summary + course revenue breakdown)

**Data Sources:**
- Students
- Courses
- Batches
- Student payments

---

### 8. Employee Performance Report
**Permission:** `VIEW_REPORTS_PERFORMANCE`  
**Description:** Individual employee performance metrics for a specific month.

**Features:**
- **Employee Selection:** Dropdown to select employee (Admin/Owner only)
- **Month Selection:** Select month (YYYY-MM format)
- **Performance Metrics:**
  - **Leads & Sales:**
    - Leads assigned (in period)
    - Leads won (in period)
    - Conversion rate
    - Sales value (in period)
  - **Task Management:**
    - Tasks completed (in period)
    - Completed on time
    - Overdue tasks completed
    - Currently in progress
  - **Monthly KPI Summary:**
    - Final KPI score
    - KPI sheet status
    - Acknowledged by employee
- **Export:** CSV download with complete performance data

**Data Sources:**
- Leads assigned to employee
- Sales by employee
- Tasks assigned to employee
- Employee KPI sheets

---

## Common Features Across All Reports

### Date Filtering
Most reports support date range filtering with:
- Custom start and end date inputs
- Quick preset buttons:
  - This Month
  - Last 3 Months
  - Last 6 Months
  - This Year

### Data Export
All reports support CSV export:
- Summary metrics
- Detailed breakdowns
- Formatted for easy analysis in Excel/Google Sheets

### Visualizations
Reports include various chart types:
- **Bar Charts:** For comparing categories (status, type, etc.)
- **Pie Charts:** For showing distributions (status, priority)
- **Horizontal Bar Charts:** For course/service comparisons

### Permission-Based Access
- Reports respect user permissions
- Data is filtered based on user role and permissions
- Users see only data they're allowed to access

### Responsive Design
- All reports are mobile-friendly
- Charts adapt to screen size
- Tables are scrollable on small screens

---

## Report Components Structure

```
components/reports/
├── ReportsPage.tsx              # Main reports landing page
├── MyActivityReport.tsx         # Personal activity summary
├── LeadsReport.tsx              # Leads analytics
├── SalesReport.tsx              # Sales performance
├── TasksReport.tsx              # Task management
├── ExpenseReport.tsx            # Expense tracking
├── CompanyFinancialReport.tsx   # Financial overview
├── TrainingCenterReport.tsx     # Training analytics
├── EmployeePerformanceReport.tsx # Employee metrics
└── ui/
    ├── ReportSection.tsx        # Report container component
    └── StatDisplayCard.tsx      # Statistic display card
```

---

## How to Use Reports

### Accessing Reports
1. Navigate to **Reports** in the sidebar
2. Click on any report card to view detailed analytics
3. Use the back button to return to report selection

### Filtering Data
1. Select date range using:
   - Date inputs for custom ranges
   - Preset buttons for common periods
2. For Expense Report: Select category from dropdown
3. For Employee Performance: Select employee and month

### Exporting Data
1. Click **Download CSV** or **Download CSVs** button
2. File(s) will download automatically
3. Open in Excel/Google Sheets for further analysis

---

## Technical Implementation

### Data Fetching
- All reports use `useCallback` for optimized data fetching
- Data is fetched on component mount and when filters change
- Loading states are shown during data fetch

### State Management
- React hooks (`useState`, `useEffect`, `useMemo`) for state management
- `useMemo` for expensive calculations and filtering
- Optimized re-renders with proper dependency arrays

### API Integration
Reports use various API functions:
- `apiGetLeads()`
- `apiGetSalesRecords()`
- `apiGetTasks()`
- `apiGetExpenses()`
- `apiGetPaymentsForPeriod()`
- `apiGetStudentPaymentsForPeriod()`
- `apiGetExpensesForPeriod()`
- `apiGetVisaReloadsForPeriod()`
- `apiGetPayrollTotalsForPeriod()`
- `apiGetStudents()`
- `apiGetCourses()`
- `apiGetBatches()`
- `apiGetStudentPayments()`
- `apiGetUsers()`
- `apiGetEmployeeKpiSheet()`

### Chart Library
- Uses **Recharts** for all visualizations
- Responsive containers for mobile support
- Custom colors matching app theme
- Dark mode support

---

## Future Enhancements

Potential improvements for the reports module:

1. **Additional Reports:**
   - HR Reports (Payroll, Leave, Attendance)
   - Client Reports (Activity, Payment History)
   - Project Reports (Status, Completion Rates)
   - Facebook Ads Reports (Campaign Performance)
   - Billboard Reports (Sales by Location)

2. **Enhanced Features:**
   - PDF export option
   - Excel export with formatting
   - Scheduled report emails
   - Report templates
   - Custom date range presets
   - Comparison periods (YoY, MoM)
   - Drill-down capabilities
   - Real-time data refresh

3. **Visualization Improvements:**
   - More chart types (line, area, scatter)
   - Interactive tooltips
   - Chart annotations
   - Trend indicators
   - Goal/target lines

4. **Performance:**
   - Data caching
   - Pagination for large datasets
   - Lazy loading
   - Optimized queries

---

## Permissions Required

| Report | Permission |
|--------|-----------|
| My Activity Summary | None (all users) |
| Leads Report | `VIEW_LEADS` |
| Sales Report | `VIEW_SALES_RECORDS` |
| Tasks Report | `VIEW_TASKS` |
| Expense Report | `MANAGE_EXPENSES` |
| Company Financial Report | `VIEW_FINANCE_DASHBOARD` |
| Training Center Report | `VIEW_TRAINING_CENTER` |
| Employee Performance Report | `VIEW_REPORTS_PERFORMANCE` |

**Note:** Access to the Reports module itself requires `VIEW_REPORTS` permission.

---

## Best Practices

1. **Date Ranges:** Use appropriate date ranges to avoid performance issues with very large datasets
2. **Export:** Export data regularly for record-keeping and analysis
3. **Permissions:** Ensure users have appropriate permissions before granting report access
4. **Data Accuracy:** Reports reflect real-time data from the system
5. **Performance:** Large date ranges may take longer to load

---

## Support

For issues or questions about reports:
1. Check user permissions
2. Verify date ranges are valid
3. Ensure data exists for the selected period
4. Check browser console for errors
5. Contact system administrator

---

## Version History

- **v1.0** - Initial implementation with 8 core reports
- **v1.1** - Added date filtering to Sales, Leads, and Tasks reports
- **v1.2** - Enhanced UI consistency and export options

---

*Last Updated: 2024*

