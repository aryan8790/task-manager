# TaskFlow — Team Task Manager

A full-stack web application for managing projects, assigning tasks, and tracking team progress with role-based access control.

## Live Demo
Deploy to Railway (see Deployment section below)

---

## Features

### Authentication
- JWT-based signup / login
- First registered user is automatically **Admin**
- Tokens expire after 7 days

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| Create/delete projects | ✅ | ✅ (own) |
| Add/remove members | ✅ (project admin) | ❌ |
| Create tasks | ✅ | ✅ |
| Edit any task | ✅ | Own / assigned |
| Delete any task | ✅ | Own only |
| Manage users | ✅ | ❌ |

### Projects
- Create projects; creator becomes project admin
- Add / remove team members with roles (admin/member)
- Progress tracking (% complete)

### Tasks
- Create tasks with title, description, priority (low/medium/high), status, assignee, due date
- Kanban board view (To Do / In Progress / Done)
- List view with filters (status, priority)
- Quick status updates

### Dashboard
- Stats: total tasks, in-progress, done, overdue, my tasks
- Recent activity feed
- Overdue task alerts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 4 |
| Database | SQLite (Node.js built-in `node:sqlite`) |
| Auth | JWT + bcryptjs |
| Frontend | Vanilla JS SPA (no framework, no build step) |
| Deployment | Railway |

---

## Local Development

### Prerequisites
- Node.js 22+

### Setup
```bash
git clone <your-repo>
cd task-manager
npm install
cp .env.example .env    # edit JWT_SECRET
node --experimental-sqlite server.js
```

Open http://localhost:3000

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List my projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project + members |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/members | Add member |
| DELETE | /api/projects/:id/members/:userId | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (filterable) |
| GET | /api/tasks/dashboard | Dashboard stats |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Task detail |
| PUT | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/status | Quick status update |
| DELETE | /api/tasks/:id | Delete task |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| PUT | /api/users/:id/role | Change role |
| DELETE | /api/users/:id | Delete user |

---

## Deployment on Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   - `JWT_SECRET` → any long random string
   - `NODE_ENV` → `production`
5. Railway auto-detects Node.js and runs `npm start`
6. Your app is live at the provided URL

> **Note:** Railway's ephemeral filesystem resets on redeploy. For persistent data, attach a Railway Volume and set `DB_PATH=/data/taskmanager.db`.

---

## Project Structure

```
task-manager/
├── server.js              # Express app entry point
├── db.js                  # SQLite setup & schema
├── middleware/
│   └── auth.js            # JWT authenticate + requireAdmin
├── routes/
│   ├── auth.js            # Signup, login, /me
│   ├── projects.js        # Project & member management
│   ├── tasks.js           # Task CRUD + dashboard
│   └── users.js           # User management (admin)
├── public/
│   └── index.html         # SPA frontend
├── railway.json           # Railway deployment config
├── .env.example
└── package.json
```

---

## Database Schema

```sql
users         (id, name, email, password, role, created_at)
projects      (id, name, description, owner_id, created_at)
project_members (project_id, user_id, role)
tasks         (id, project_id, title, description, assignee_id,
               status, priority, due_date, created_by, created_at, updated_at)
```

---

## Quick Start (Demo)

1. Sign up — first account becomes Admin
2. Create a project
3. Invite teammates via the Members tab
4. Add tasks, assign them, set due dates
5. Track progress on the Kanban board or Dashboard
