# 🔐 Zero Trust Encrypted File Sharing System

**Final Semester Project** | Full Stack Web Application  
**Tech Stack:** Python + FastAPI + PostgreSQL + React + Tailwind CSS

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Setup Guide - Step by Step](#setup-guide)
6. [Running the Application](#running-the-application)
7. [Testing the API](#testing-the-api)
8. [Security Features](#security-features)

---

## 🏗️ Project Overview

A secure file sharing system where:
- Files are **encrypted (AES-128)** before storage
- **JWT tokens** authenticate every request
- Users are isolated by **department**
- **Admin** has full control over users and files
- File download **automatically decrypts** the file

---

## 📁 Architecture

```
zero-trust-app/
│
├── backend/                    ← Python FastAPI Server
│   ├── app/
│   │   ├── main.py            ← App entry point, startup
│   │   ├── config.py          ← Settings (reads .env)
│   │   ├── database.py        ← SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── user.py        ← User, Role, Department tables
│   │   │   └── file.py        ← File, Folder, FileShare tables
│   │   ├── schemas/
│   │   │   ├── user.py        ← Pydantic request/response models
│   │   │   └── file.py        ← File-related schemas
│   │   ├── routers/
│   │   │   ├── auth.py        ← POST /auth/login, /auth/logout
│   │   │   ├── users.py       ← CRUD /users/
│   │   │   ├── files.py       ← Upload/Download/Delete /files/
│   │   │   └── folders.py     ← Folder management /folders/
│   │   └── utils/
│   │       ├── auth.py        ← JWT create/verify, bcrypt
│   │       ├── encryption.py  ← Fernet AES encryption/decryption
│   │       └── file_validator.py ← Extension blocklist, size check
│   ├── uploads/               ← Encrypted files stored here
│   │   └── keys/              ← Per-file encryption keys
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                   ← React Application
    ├── src/
    │   ├── App.js             ← Routes
    │   ├── context/
    │   │   └── AuthContext.js ← Global auth state
    │   ├── services/
    │   │   └── api.js         ← All Axios API calls
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   └── ProtectedRoute.js
    │   └── pages/
    │       ├── LoginPage.js
    │       ├── DashboardPage.js
    │       ├── UploadPage.js
    │       ├── FilesPage.js
    │       ├── FoldersPage.js
    │       └── AdminPage.js
    ├── package.json
    └── tailwind.config.js
```

---

## 🗃️ Database Schema

```sql
-- Users table
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,     -- bcrypt hash
    full_name       VARCHAR(100),
    role            ENUM('admin', 'user') DEFAULT 'user',
    department      ENUM('engineering','marketing','finance','hr',
                         'operations','sales','it','legal','general'),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Folders table
CREATE TABLE folders (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id    INTEGER REFERENCES users(id),
    department  VARCHAR(50) NOT NULL,
    parent_id   INTEGER REFERENCES folders(id),   -- nested folders
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id                  SERIAL PRIMARY KEY,
    original_filename   VARCHAR(255) NOT NULL,     -- "report.pdf"
    stored_filename     VARCHAR(255) NOT NULL,     -- "uuid.enc" (encrypted)
    file_size           BIGINT NOT NULL,           -- bytes
    file_extension      VARCHAR(20),
    mime_type           VARCHAR(100),
    encryption_key_ref  VARCHAR(255) NOT NULL,     -- points to key file
    uploaded_by_id      INTEGER REFERENCES users(id),
    department          VARCHAR(50) NOT NULL,
    folder_id           INTEGER REFERENCES folders(id),
    status              ENUM('active','deleted') DEFAULT 'active',
    description         TEXT,
    upload_date         TIMESTAMP DEFAULT NOW()
);

-- File sharing table
CREATE TABLE file_shares (
    id                      SERIAL PRIMARY KEY,
    file_id                 INTEGER REFERENCES files(id),
    shared_with_department  VARCHAR(50) NOT NULL,
    shared_at               TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint       | Description            | Auth Required |
|--------|---------------|------------------------|---------------|
| POST   | /auth/login   | Login, get JWT token   | No            |
| POST   | /auth/logout  | Logout                 | Yes           |
| GET    | /auth/me      | Get current user info  | Yes           |

### Users (Admin Only)
| Method | Endpoint       | Description       |
|--------|---------------|-------------------|
| POST   | /users/       | Create user       |
| GET    | /users/       | List all users    |
| GET    | /users/{id}   | Get user by ID    |
| PUT    | /users/{id}   | Update user       |
| DELETE | /users/{id}   | Delete user       |

### Files
| Method | Endpoint                | Description              |
|--------|------------------------|--------------------------|
| POST   | /files/upload          | Upload & encrypt file    |
| GET    | /files/                | List accessible files    |
| GET    | /files/download/{id}   | Download & decrypt file  |
| DELETE | /files/{id}            | Delete file              |
| POST   | /files/{id}/share      | Share with department    |

### Folders
| Method | Endpoint         | Description     |
|--------|-----------------|-----------------|
| POST   | /folders/       | Create folder   |
| GET    | /folders/       | List folders    |
| DELETE | /folders/{id}   | Delete folder   |

---

## 🚀 Setup Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

---

### STEP 1: Install PostgreSQL and Create Database

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres psql
```

**In the psql prompt:**
```sql
CREATE DATABASE zerotrust_db;
CREATE USER postgres WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE zerotrust_db TO postgres;
\q
```

**On Windows:**
- Download from: https://www.postgresql.org/download/windows/
- During install, set a password for the `postgres` user
- Open pgAdmin and create database `zerotrust_db`

---

### STEP 2: Setup Backend

```bash
# Navigate to backend folder
cd zero-trust-app/backend

# Create Python virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env
```

**Edit `.env` with your database credentials:**
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/zerotrust_db
SECRET_KEY=my-super-secret-key-change-this-123456789
ACCESS_TOKEN_EXPIRE_MINUTES=60
UPLOAD_DIR=uploads
```

**Create the uploads folder:**
```bash
mkdir -p uploads/keys
```

---

### STEP 3: Run the Backend Server

```bash
# Make sure you're in backend/ folder with venv activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
✅ Zero Trust File Sharing System started successfully!
📚 API docs available at: http://localhost:8000/docs
👤 Default admin created: username=admin, password=Admin@123
```

**Test it's working:** Open http://localhost:8000/docs in browser

---

### STEP 4: Setup Frontend

Open a **new terminal:**

```bash
# Navigate to frontend folder
cd zero-trust-app/frontend

# Install Node.js dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

### STEP 5: Run the Frontend

```bash
# Still in frontend/ folder
npm start
```

Frontend opens at: http://localhost:3000

---

## 🔑 Default Login

After starting the backend, a default admin is created:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `Admin@123`|

> ⚠️ **Change this password immediately in production!**

---

## 🧪 Testing the API

### Using Swagger UI (Recommended for Beginners)
1. Open http://localhost:8000/docs
2. Click **POST /auth/login** → Try it out → Enter credentials → Execute
3. Copy the `access_token` from the response
4. Click **Authorize** at the top → Enter: `Bearer <token>`
5. Now all other endpoints work

### Using curl
```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}'

# Upload file (replace TOKEN)
curl -X POST http://localhost:8000/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/yourfile.pdf"

# List files
curl http://localhost:8000/files/ \
  -H "Authorization: Bearer TOKEN"

# Download file (replace FILE_ID)
curl http://localhost:8000/files/download/FILE_ID \
  -H "Authorization: Bearer TOKEN" \
  -o downloaded_file.pdf
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (via passlib) |
| Authentication | JWT tokens (python-jose) |
| File Encryption | Fernet = AES-128-CBC + HMAC-SHA256 |
| Key Storage | Separate key file per upload |
| Extension Blocking | .exe, .bat, .sh, .ps1, .php, etc. |
| File Size Limit | 50 MB maximum |
| Role-Based Access | Admin vs Department User |
| Department Isolation | Users only see their dept's files |
| Token Expiry | 60 minutes (configurable) |
| CORS | Only allows localhost:3000 |

---

## 🔒 How Encryption Works

```
Upload Flow:
User selects file → Frontend sends to API → 
API generates unique Fernet key →
API encrypts file bytes → 
Encrypted file saved as UUID.enc →
Key saved as UUID.key in /uploads/keys/ →
File metadata (key_ref, filename, etc.) saved to PostgreSQL

Download Flow:
User clicks download → API checks authorization →
API reads encrypted file from disk →
API loads key using key_ref from database →
API decrypts bytes using Fernet key →
Original file bytes returned to user
```

---

## 🐛 Common Issues

**"psycopg2 error" on startup:**
```bash
pip install psycopg2-binary
```

**"Module not found" errors:**
```bash
# Make sure you're running from the backend/ directory
cd backend
uvicorn app.main:app --reload
```

**CORS error in browser:**
- Make sure backend is running on port 8000
- Frontend proxy is set to http://localhost:8000 in package.json

**Frontend can't connect:**
- Check backend is running: http://localhost:8000/health
- Check no firewall blocking port 8000

---

## 📊 Project Summary

This project demonstrates:
- ✅ RESTful API design with FastAPI
- ✅ Database modeling with SQLAlchemy ORM
- ✅ JWT-based stateless authentication
- ✅ Symmetric file encryption with AES
- ✅ Role-based access control (RBAC)
- ✅ React SPA with protected routes
- ✅ File upload with progress tracking
- ✅ Department-based data isolation
- ✅ Security best practices (input validation, bcrypt, etc.)
