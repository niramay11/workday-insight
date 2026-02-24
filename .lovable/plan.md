

# 🕐 Employee Time Tracking & Monitoring Platform

A modern SaaS-style web application for tracking employee attendance, timesheets, activity, and productivity — with a robust admin panel and department-based organization.

---

## 🔐 Phase 1: Authentication & User Management

- **Employee login/signup** with email & password via Supabase Auth
- **Role-based access**: Admin, Department Manager, Employee
- **Admin can invite employees** and assign them to departments
- **Employees can only see their own data**; Managers see their department; Admins see everything

---

## 🏢 Phase 2: Department & Employee Management (Admin)

- **Department CRUD** — Create, edit, delete departments (e.g., Engineering, Sales, HR)
- **Employee directory** — View all employees, filter by department, search by name
- **Assign employees to departments** and set their roles (employee/manager)
- **Employee profile pages** with contact info and status (active/inactive)

---

## ⏱️ Phase 3: Punch In / Punch Out System

- **One-click punch in/out** button on employee dashboard
- **Auto-tracks work hours** based on punch timestamps
- **Prevents duplicate punch-ins** (must punch out before punching in again)
- **Daily timesheet view** showing all punch entries with total hours
- **Late arrival & early departure flags** based on configurable work hours

---

## 🖥️ Phase 4: Browser-Based Activity Monitoring (Phase 1 of monitoring)

- **Browser tab idle detection** — Detects when the user hasn't interacted with the browser for a configurable time (10-15 mins)
- **Lock screen overlay** — When idle is detected, the app shows a lock screen requiring re-authentication
- **Return reason form** — On unlocking, employee must enter what they were doing and what task they're resuming
- **Idle logs stored** — Duration of idle time + reason captured and visible to admin
- **Browser tab screenshot** (optional) — Periodic screenshot of the app tab every 30-60 mins, stored securely

> 💡 The system will be designed with an **API endpoint** so a desktop agent can later push full desktop screenshots and OS-level idle data into the same system.

---

## 📊 Phase 5: Admin Dashboard & Analytics

- **Overview dashboard** with key metrics:
  - Total employees present today
  - Average hours worked
  - Late arrivals count
  - Idle time summary
- **Charts & visualizations**: Daily/weekly/monthly attendance trends, department-wise breakdowns, productivity scores
- **Activity timeline per employee** — See punch in/out, idle periods, screenshots, and task notes in chronological order

---

## 📋 Phase 6: Detailed Logs & Reports

- **Employee activity log** — Full timeline: punches, idle events, reasons, screenshots
- **Attendance report** — Daily/weekly/monthly views with filters by department and date range
- **Timesheet report** — Total hours worked per employee with overtime calculations
- **CSV/Excel export** for all reports
- **Department Manager view** — Filtered to only show their department's data

---

## 🗂️ Phase 7: Employee Self-Service

- **Personal dashboard** showing today's status, hours worked, recent activity
- **View own timesheet history** with weekly/monthly summaries
- **View own idle logs and reasons**
- **Cannot see other employees' data**

---

## 🛠️ Technical Architecture

- **Frontend**: React + TypeScript with modern SaaS design (dark sidebar, clean cards, vibrant accents)
- **Backend**: Supabase (database, auth, storage for screenshots, edge functions for APIs)
- **Role-based security**: Row Level Security policies ensuring data isolation
- **API-ready**: Edge function endpoints designed for future desktop agent integration

---

## 🎨 Design Direction

- Modern SaaS look inspired by tools like Hubstaff/Time Doctor
- Dark sidebar navigation with a clean white/light content area
- Color-coded status indicators (green = active, yellow = idle, red = absent)
- Responsive design for admin use on desktop and tablets

