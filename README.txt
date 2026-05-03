================================================================================
  TASKFLOW — Team Task Manager | Full-Stack Web Application
================================================================================

LIVE URL:    https://your-app.up.railway.app   (update after deploy)
GITHUB REPO: https://github.com/yourusername/task-manager

--------------------------------------------------------------------------------
TECH STACK
--------------------------------------------------------------------------------
Backend  : Node.js, Express.js, better-sqlite3, bcryptjs, jsonwebtoken
Frontend : Vanilla HTML/CSS/JS SPA (no framework, no build step)
Deploy   : Railway.app

--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------
- JWT Authentication (Signup/Login, 7-day tokens)
- First registered user is auto-promoted to Admin
- Role-Based Access: System roles (Admin/Member) + per-project roles
- Projects: create, edit, delete, track progress
- Team management: add/remove members per project
- Tasks: title, description, assignee, priority, status, due date
- Kanban board view + List view with filters
- Dashboard: live stats (total/todo/in-progress/done/overdue/mine)
- Overdue task detection and visual alerts
- Quick status updates from My Tasks page

--------------------------------------------------------------------------------
DATABASE SCHEMA (SQLite)
--------------------------------------------------------------------------------
users           id, name, email, password, role, created_at
projects        id, name, description, owner_id, created_at
project_members project_id, user_id, role  (composite PK, FK cascade)
tasks           id, project_id, title, description, assignee_id,
                status, priority, due_date, created_by, created_at, updated_at

--------------------------------------------------------------------------------
REST API
--------------------------------------------------------------------------------
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:uid

GET    /api/tasks              (filters: project_id, assignee_id, status, priority, overdue)
GET    /api/tasks/dashboard
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
PATCH  /api/tasks/:id/status
DELETE /api/tasks/:id

GET    /api/users              (admin only)
PUT    /api/users/:id/role     (admin only)
DELETE /api/users/:id          (admin only)

--------------------------------------------------------------------------------
LOCAL SETUP
--------------------------------------------------------------------------------
  git clone <repo-url> && cd task-manager
  npm install
  npm start
  open http://localhost:3000

Optional env vars: PORT, JWT_SECRET, DB_PATH

--------------------------------------------------------------------------------
RAILWAY DEPLOYMENT
--------------------------------------------------------------------------------
1. Push to GitHub
2. New Project → Deploy from GitHub repo
3. Railway auto-detects Node.js (npm install + node server.js)
4. Set JWT_SECRET in Variables tab
5. Done — your live URL appears in the dashboard

--------------------------------------------------------------------------------
RBAC RULES
--------------------------------------------------------------------------------
- First signup = System Admin (auto)
- System Admin: full access to all projects, tasks, users
- Project Admin: manage members, all tasks in their project
- Member: create tasks, edit own/assigned tasks, view project

================================================================================
