# Timetable Management System

A modern web-based timetable management system for academic institutions with AI-powered auto-generation.

## ✨ Features

### For Students
- View personalized timetables (original & CR-modified versions)
- Select elective courses
- Export to Excel, PDF, and iCalendar formats
- Sync with Google Calendar
- Color-coded courses for easy identification

### For Class Representatives (CRs)
- JWT-authenticated access
- Copy and modify original timetables
- Drag-and-drop interface
- Google Calendar integration

### For Incharge (Admin)
- **Semester Setup**: Configure odd/even semester with start/end dates
- **Class Management**: Create B.Tech, M.Tech, PhD classes with sections
- **Course Management**: Add courses with L-T-P breakdown
- **Single Class Builder**: Focus on one class timetable
- **Master Builder**: Manage multiple classes simultaneously
- **Auto-Generate Draft**: AI-powered timetable generation with constraints:
  - No professor slot conflicts
  - Lab room availability checks
  - Labs scheduled only in 3-hour blocks (9-12 or 2-5)
  - Optimal slot allocation

## 🛠 Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express
- **Database**: SQLite
- **UI Components**: shadcn/ui with Radix UI
- **Drag & Drop**: @dnd-kit
- **Authentication**: JWT for CRs, session-based for Incharge

## 📦 Installation

### Server Setup

```bash
cd server
npm install
npm start
```

Server runs on http://localhost:3001

### Client Setup

```bash
cd client
npm install
npm run dev
```

Client runs on http://localhost:3000

## 🔑 Default Credentials

**Incharge Password**: `admin123`

## 🚀 Getting Started

### First Time Setup (Incharge)

1. Login with password `admin123`
2. **Semester Setup**:
   - Enter semester name (e.g., "Fall 2024")
   - Select type (Odd/Even)
   - Set start and end dates
3. **Class Setup**:
   - Add classes: Select program (B.Tech/M.Tech/PhD), year, and section
   - Add multiple classes as needed
4. **Course Management**:
   - Add courses with code, name, instructor
   - Set L-T-P hours (Lecture-Tutorial-Practical)
   - Assign to sections
   - Mark electives
5. **Timetable Building**:
   - Use Master Builder for multiple classes
   - Click "Generate Draft Timetable" for AI-powered scheduling
   - Fine-tune with drag-and-drop
   - Publish when ready

### For Students

1. Select semester and section
2. Choose electives if available
3. Toggle between original and CR-modified views
4. Export or sync to calendar

### For CRs

1. Login with credentials (created by Incharge)
2. Copy original timetable
3. Modify using drag-and-drop
4. Students will see both versions

## 📁 Project Structure

```
timetable-app/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn components
│   │   │   ├── Home.jsx
│   │   │   ├── StudentView/
│   │   │   ├── InchargeView/
│   │   │   │   ├── SemesterSetup.jsx
│   │   │   │   ├── CourseManagementNew.jsx
│   │   │   │   ├── MasterTimetableBuilderNew.jsx
│   │   │   │   └── ...
│   │   │   ├── CRView/
│   │   │   └── Common/
│   │   ├── lib/
│   │   └── App.jsx
│   ├── components.json          # shadcn config
│   └── package.json
├── server/
│   ├── database/
│   │   ├── schema.sql
│   │   └── db.js
│   ├── routes/
│   │   ├── semester.js          # Semester & class management
│   │   ├── autogenerate.js      # AI timetable generation
│   │   ├── courses.js
│   │   ├── timetable.js
│   │   ├── cr.js
│   │   └── student.js
│   └── server.js
└── README.md
```

## 🗄 Database Schema

- **semesters**: Semester configuration (name, type, dates)
- **classes**: Class/section configuration (program, year, section)
- **courses**: Course information with L-T-P breakdown
- **timetable_slots**: Original timetable by Incharge
- **cr_timetable_slots**: Modified versions by CRs
- **users**: CR authentication
- **settings**: Configuration (password, time slots)

## 🎨 UI Components

Built with shadcn/ui for a clean, modern, and accessible interface:
- Button, Card, Dialog, Input, Label, Select
- Badge, Separator, Calendar
- Consistent design system with Tailwind CSS

## 🤖 Auto-Generation Algorithm

The draft timetable generator considers:
1. **Professor Availability**: No overlapping slots for same instructor
2. **Lab Constraints**: 
   - Labs only in 3-hour continuous blocks
   - Slots 2-3-4 (9:00-11:45) or 5-6-7 (12:00-14:45)
   - Lab room conflict prevention
3. **Course Hours**: Schedules exact L-T-P hours
4. **Optimal Distribution**: Spreads classes across the week

## 📝 License

MIT
