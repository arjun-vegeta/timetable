# 🚀 Timetable Management System - Running!

## ✅ Status
- **Server**: http://localhost:3001 ✓
- **Client**: http://localhost:3000 ✓
- **Database**: Seeded with sample data ✓

## 🔑 Credentials

### Incharge (Admin)
- Password: `admin123`

### Sample CRs (Class Representatives)
- Username: `cr_iii_s1` | Password: `cr123` | Class: III Semester, S1
- Username: `cr_v_s1` | Password: `cr123` | Class: V Semester, S1
- Username: `cr_mtech_cse` | Password: `cr123` | Class: I M.Tech, CSE

## 📊 Sample Data Loaded

### Courses
- **III Semester**: CS201, CS202, CS203, CS204, MA204, SM300
- **V Semester**: CS301, CS302, CS303, CS304, CS305, CS252M
- **I M.Tech**: CS700, CS701, CS702, CS800, MA714

### Timetables
- **V Semester S1**: Complete week timetable (Monday-Friday, all slots)
- Includes CS301, CS302, CS303, CS304, CS305, CS252M courses

## 🎯 Quick Start

### For Incharge (Admin)
1. Go to http://localhost:3000
2. Click "Incharge Login"
3. Password: `admin123`
4. Options:
   - **Manage Courses** - Add/edit courses
   - **Manage CRs** - Create CR accounts
   - **Single Class Builder** - Build one timetable
   - **Master Builder** - Build multiple timetables at once

### For CR (Class Representative)
1. Click "CR Login"
2. Use one of the sample CR accounts above
3. Copy original timetable
4. Modify using drag & drop
5. Students will see both versions

### For Students
1. Click "Student View"
2. Select semester and section
3. Toggle between original and CR versions
4. Export or sync to Google Calendar

## 🔧 Commands

### Restart Servers
```bash
# Server
cd server && npm start

# Client  
cd client && npm run dev
```

### Reseed Database
```bash
cd server
rm database/timetable.db
npm start  # Creates fresh database
npm run seed  # Adds sample data
```

## 🎨 Features

- **JWT Authentication** for CRs
- **Dual Timetable View** (Original + CR Modified)
- **Master Timetable Builder** (Multiple classes)
- **Google Calendar Integration**
- **Drag & Drop** interface
- **Export** to Excel, PDF, Calendar
- **Color-Coded Courses** - Each course has unique color
- **Elective Selection** - Students can choose electives

## 📱 Access

Open: **http://localhost:3000**

Enjoy! 🎉
