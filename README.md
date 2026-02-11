# ระบบแจ้งซ่อม มหาวิทยาลัยศรีราชยศรรธนี (SRU Maintenance System)

[English](#english-version) | [ไทย](#thai-version)

---

## Thai Version

### 📋 ภาพรวม
ระบบแจ้งซ่อมออนไลน์สำหรับมหาวิทยาลัยศรีราชยศรรธนี ที่ช่วยให้ผู้ใช้งาน เจ้าหน้าที่ซ่อม หัวหน้างาน และผู้ดูแลระบบสามารถจัดการการแจ้งซ่อมได้อย่างมีประสิทธิภาพ

### ✨ คุณสมบัติหลัก
- 👤 **ผู้ใช้งานทั่วไป** - แจ้งซ่อมและติดตามสถานะ
- 🔧 **เจ้าหน้าที่ซ่อม** - จัดการงานซ่อมแซม
- 👨‍💼 **หัวหน้างาน** - มอบหมายงานและติดตามทีม
- ⚙️ **ผู้ดูแลระบบ** - จัดการผู้ใช้งานและระบบ

### 🚀 เริ่มต้นใช้งาน

#### ตัวเลือกที่ 1: Windows Batch Script (ง่ายที่สุด)
```bash
# เพียงดับเบิลคลิกไฟล์นี้:
start.bat
```

#### ตัวเลือกที่ 2: PowerShell (มีรายละเอียดมากกว่า)
```powershell
# เปิด PowerShell แล้วรัน:
.\start.ps1
```

#### ตัวเลือกที่ 3: ตั้งค่าเอง
```bash
# 1. เริ่มต้นฐานข้อมูล
cd backend
npm install
node init-db.js

# 2. เปิด Terminal ใหม่ เรียกใช้ Backend
cd backend
node server.js

# 3. เปิด Terminal ใหม่ เรียกใช้ Frontend
cd frontend
npm install
npm run dev
```

### 👤 ข้อมูลรับรองทดสอบ
| บทบาท | ชื่อผู้ใช้ | รหัสผ่าน |
|------|----------|---------|
| ผู้ใช้ทั่วไป | user1 | password123 |
| เจ้าหน้าที่ซ่อม | tech1 | password123 |
| หัวหน้างาน | supervisor1 | password123 |
| ผู้ดูแลระบบ | admin1 | password123 |

### 📂 โครงสร้างโปรเจคต์
```
my-repair-app/
├── backend/                    # Express API Server
│   ├── server.js              # Main server file
│   ├── database.js            # PostgreSQL connection
│   ├── init-db.js             # Database initialization
│   ├── package.json           # Backend dependencies
│   └── .env                   # Environment variables
│
├── frontend/                   # React Vite App
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Login.css
│   │   │   ├── Register.jsx
│   │   │   ├── Register.css
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── TechnicianDashboard.jsx
│   │   │   ├── SupervisorDashboard.jsx
│   │   │   └── ...
│   │   ├── App.jsx            # Main App component
│   │   ├── main.jsx           # Entry point
│   │   └── ...
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
│
├── QUICK_START.md             # Quick start guide
├── SETUP_GUIDE.md             # Detailed setup guide
├── start.bat                  # Windows batch script
└── start.ps1                  # Windows PowerShell script
```

### 📖 เอกสารเพิ่มเติม
- [QUICK_START.md](./QUICK_START.md) - คู่มือเริ่มต้นอย่างรวดเร็ว
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - คู่มือตั้งค่าโดยละเอียด

---

## English Version

### 📋 Overview
An online maintenance reporting system for Suratthani Rajabhat University that enables users, technicians, supervisors, and administrators to manage maintenance requests efficiently.

### ✨ Key Features
- 👤 **Regular Users** - Submit and track repair requests
- 🔧 **Technicians** - Manage repair tasks
- 👨‍💼 **Supervisors** - Assign tasks and monitor team
- ⚙️ **Administrators** - Manage users and system

### 🚀 Quick Start

#### Option 1: Windows Batch Script (Easiest)
```bash
# Just double-click:
start.bat
```

#### Option 2: PowerShell (More Details)
```powershell
# Open PowerShell and run:
.\start.ps1
```

#### Option 3: Manual Setup
```bash
# 1. Initialize database
cd backend
npm install
node init-db.js

# 2. Open new terminal, start backend
cd backend
node server.js

# 3. Open new terminal, start frontend
cd frontend
npm install
npm run dev
```

### 👤 Test Credentials
| Role | Username | Password |
|------|----------|----------|
| Regular User | user1 | password123 |
| Technician | tech1 | password123 |
| Supervisor | supervisor1 | password123 |
| Admin | admin1 | password123 |

### 📂 Project Structure
```
my-repair-app/
├── backend/                    # Express API Server
│   ├── server.js              # Main server file
│   ├── database.js            # PostgreSQL connection
│   ├── init-db.js             # Database initialization
│   ├── package.json           # Backend dependencies
│   └── .env                   # Environment variables
│
├── frontend/                   # React Vite App
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Login.css
│   │   │   ├── Register.jsx
│   │   │   ├── Register.css
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── TechnicianDashboard.jsx
│   │   │   ├── SupervisorDashboard.jsx
│   │   │   └── ...
│   │   ├── App.jsx            # Main App component
│   │   ├── main.jsx           # Entry point
│   │   └── ...
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
│
├── QUICK_START.md             # Quick start guide
├── SETUP_GUIDE.md             # Detailed setup guide
├── start.bat                  # Windows batch script
└── start.ps1                  # Windows PowerShell script
```

### 📚 Additional Documentation
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup guide

---

## 🛠 Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **Modern CSS** - Styling with responsive design
- **Socket.io Client** - Real-time updates

### Backend
- **Node.js + Express** - Server framework
- **PostgreSQL** - Database
- **JWT + Bcrypt** - Authentication
- **Socket.io** - Real-time events
- **Multer** - File uploads

### Database
- **PostgreSQL** - Relational database
- **PostGIS** - Geographic queries (optional)

---

## 📱 Screenshots & Features

### User Dashboard
- View personal repair requests
- Create new repair request
- Filter by status (pending, in_progress, completed)
- Real-time status updates

### Technician Dashboard
- View assigned repair tasks
- Update task status
- Track work progress
- Team statistics

### Supervisor Dashboard
- Manage team workload
- Assign tasks to technicians
- Monitor team progress
- Performance metrics

### Admin Dashboard
- User management (Create, Read, Update, Delete)
- System statistics
- User role management
- Technician management

---

## 🐛 Troubleshooting

### PostgreSQL Connection Error
```bash
# Verify PostgreSQL is running
pg_isready

# Check .env credentials in backend/.env
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=repair_db
```

### Port Already in Use
```bash
# Find and kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Database Not Initialized
```bash
cd backend
node init-db.js
```

### Frontend Not Loading
```bash
cd frontend
npm cache clean --force
rm -r node_modules
npm install
npm run dev
```

---

## 📞 Support & Contributing

For issues, questions, or contributions:
1. Check the [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Review API endpoints in `backend/server.js`
3. Check component documentation in `frontend/src/components/`

---

## 📄 License
ISC

---

## 🎉 Ready to Start?

Choose your preferred startup method:
- 🚀 **Quickest**: `start.bat` (Windows only)
- 📊 **Informative**: `start.ps1` (PowerShell)
- 🛠 **Manual**: Follow manual setup steps above

All test credentials and sample data are automatically generated on first run!

Happy coding! 💻
