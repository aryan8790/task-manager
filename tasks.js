const express = require('express');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const memberOf = (db, projectId, userId) =>
  db.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').get(projectId, userId);

const fullTask = (db, id) => db.prepare(`
  SELECT t.*, u.name as assignee_name, u.email as assignee_email,
    c.name as created_by_name, p.name as project_name
  FROM tasks t
  LEFT JOIN users u ON t.assignee_id=u.id
  LEFT JOIN users c ON t.created_by=c.id
  LEFT JOIN projects p ON t.project_id=p.id
  WHERE t.id=?`).get(id);

// GET /api/tasks/dashboard  — must be before /:id
router.get('/dashboard', (req, res) => {
  const db  = getDB();
  const ids = db.prepare('SELECT project_id FROM project_members WHERE user_id=?').all(req.user.id).map(r => r.project_id);
  if (!ids.length) return res.json({ total:0, todo:0, in_progress:0, done:0, overdue:0, my_tasks:0, projects:0, recent:[] });
  const ph  = ids.map(() => '?').join(',');
  const stats = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN due_date < DATE('now') AND status!='done' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN assignee_id=? THEN 1 ELSE 0 END) as my_tasks
    FROM tasks WHERE project_id IN (${ph})`).get(req.user.id, ...ids);
  const recent = db.prepare(`
    SELECT t.*, u.name as assignee_name, p.name as project_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN projects p ON t.project_id=p.id
    WHERE t.project_id IN (${ph}) ORDER BY t.updated_at DESC LIMIT 8`).all(...ids);
  res.json({ ...stats, projects: ids.length, recent });
});

router.get('/', (req, res) => {
  const db = getDB();
  const { project_id, assignee_id, status, priority, overdue } = req.query;
  let q = `SELECT t.*, u.name as assignee_name, c.name as created_by_name, p.name as project_name
    FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN users c ON t.created_by=c.id
    LEFT JOIN projects p ON t.project_id=p.id
    JOIN project_members pm ON pm.project_id=t.project_id AND pm.user_id=? WHERE 1=1`;
  const p = [req.user.id];
  if (project_id) { q += ' AND t.project_id=?'; p.push(project_id); }
  if (assignee_id) { q += ' AND t.assignee_id=?'; p.push(assignee_id); }
  if (status) { q += ' AND t.status=?'; p.push(status); }
  if (priority) { q += ' AND t.priority=?'; p.push(priority); }
  if (overdue === 'true') q += " AND t.due_date < DATE('now') AND t.status!='done'";
  q += " ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.due_date ASC, t.created_at DESC";
  res.json(db.prepare(q).all(...p));
});

router.get('/:id', (req, res) => {
  const db   = getDB();
  const task = fullTask(db, req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!memberOf(db, task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  res.json(task);
});

router.post('/', (req, res) => {
  const { project_id, title, description, assignee_id, status, priority, due_date } = req.body;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const db = getDB();
  if (!memberOf(db, project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  if (assignee_id && !memberOf(db, project_id, assignee_id)) return res.status(400).json({ error: 'Assignee must be a project member' });
  const valid_s = ['todo','in_progress','done'], valid_p = ['low','medium','high'];
  const r = db.prepare(`INSERT INTO tasks(project_id,title,description,assignee_id,status,priority,due_date,created_by) VALUES(?,?,?,?,?,?,?,?)`)
    .run(project_id, title.trim(), description||null, assignee_id||null, valid_s.includes(status)?status:'todo', valid_p.includes(priority)?priority:'medium', due_date||null, req.user.id);
  res.status(201).json(fullTask(db, r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db   = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const mem = memberOf(db, task.project_id, req.user.id);
  if (!mem) return res.status(403).json({ error: 'Access denied' });
  const isAdmin = mem.role === 'admin' || req.user.role === 'admin';
  if (!isAdmin && task.assignee_id !== req.user.id && task.created_by !== req.user.id)
    return res.status(403).json({ error: 'Cannot edit this task' });
  const { title, description, assignee_id, status, priority, due_date } = req.body;
  const valid_s = ['todo','in_progress','done'], valid_p = ['low','medium','high'];
  db.prepare(`UPDATE tasks SET
    title=COALESCE(?,title), description=COALESCE(?,description),
    assignee_id=?, status=COALESCE(?,status), priority=COALESCE(?,priority),
    due_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title?.trim()||null, description!==undefined?description:null,
      assignee_id!==undefined?(assignee_id||null):task.assignee_id,
      valid_s.includes(status)?status:null, valid_p.includes(priority)?priority:null,
      due_date!==undefined?(due_date||null):task.due_date, req.params.id);
  res.json(fullTask(db, req.params.id));
});

router.patch('/:id/status', (req, res) => {
  const db   = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!memberOf(db, task.project_id, req.user.id)) return res.status(403).json({ error: 'Access denied' });
  const { status } = req.body;
  if (!['todo','in_progress','done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare("UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status, req.params.id);
  res.json({ message: 'Updated', status });
});

router.delete('/:id', (req, res) => {
  const db   = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const mem = memberOf(db, task.project_id, req.user.id);
  if (!mem) return res.status(403).json({ error: 'Access denied' });
  const isAdmin = mem.role === 'admin' || req.user.role === 'admin';
  if (!isAdmin && task.created_by !== req.user.id) return res.status(403).json({ error: 'Cannot delete this task' });
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
