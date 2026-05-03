const express = require('express');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const memberOf = (db, projectId, userId) =>
  db.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').get(projectId, userId);

router.get('/', (req, res) => {
  const rows = getDB().prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id=p.id) as member_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status='done') as done_count,
      pm.role as my_role
    FROM projects p
    JOIN users u ON p.owner_id=u.id
    JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?
    ORDER BY p.created_at DESC`).all(req.user.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
  const db = getDB();
  const r  = db.prepare('INSERT INTO projects(name,description,owner_id) VALUES(?,?,?)').run(name.trim(), description||null, req.user.id);
  db.prepare('INSERT INTO project_members(project_id,user_id,role) VALUES(?,?,?)').run(r.lastInsertRowid, req.user.id, 'admin');
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id=?').get(r.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const db = getDB();
  const mem = memberOf(db, req.params.id, req.user.id);
  if (!mem) return res.status(403).json({ error: 'Access denied' });
  const proj = db.prepare(`SELECT p.*, u.name as owner_name, ? as my_role FROM projects p JOIN users u ON p.owner_id=u.id WHERE p.id=?`).get(mem.role, req.params.id);
  if (!proj) return res.status(404).json({ error: 'Not found' });
  const members = db.prepare(`SELECT u.id,u.name,u.email,u.role as system_role,pm.role as project_role FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? ORDER BY pm.role DESC,u.name`).all(req.params.id);
  res.json({ ...proj, members });
});

router.put('/:id', (req, res) => {
  const db  = getDB();
  const mem = memberOf(db, req.params.id, req.user.id);
  if (!mem || (mem.role !== 'admin' && req.user.role !== 'admin')) return res.status(403).json({ error: 'Admin required' });
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
  db.prepare('UPDATE projects SET name=?,description=? WHERE id=?').run(name.trim(), description||null, req.params.id);
  res.json({ message: 'Updated' });
});

router.delete('/:id', (req, res) => {
  const db   = getDB();
  const proj = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!proj) return res.status(404).json({ error: 'Not found' });
  if (proj.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Only owner can delete' });
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

router.post('/:id/members', (req, res) => {
  const db  = getDB();
  const mem = memberOf(db, req.params.id, req.user.id);
  if (!mem || (mem.role !== 'admin' && req.user.role !== 'admin')) return res.status(403).json({ error: 'Admin required' });
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!db.prepare('SELECT id FROM users WHERE id=?').get(userId)) return res.status(404).json({ error: 'User not found' });
  if (memberOf(db, req.params.id, userId)) return res.status(409).json({ error: 'Already a member' });
  db.prepare('INSERT INTO project_members(project_id,user_id,role) VALUES(?,?,?)').run(req.params.id, userId, role==='admin'?'admin':'member');
  res.status(201).json({ message: 'Member added' });
});

router.delete('/:id/members/:userId', (req, res) => {
  const db   = getDB();
  const mem  = memberOf(db, req.params.id, req.user.id);
  if (!mem || (mem.role !== 'admin' && req.user.role !== 'admin')) return res.status(403).json({ error: 'Admin required' });
  const proj = db.prepare('SELECT owner_id FROM projects WHERE id=?').get(req.params.id);
  if (proj.owner_id == req.params.userId) return res.status(400).json({ error: 'Cannot remove owner' });
  db.prepare('DELETE FROM project_members WHERE project_id=? AND user_id=?').run(req.params.id, req.params.userId);
  res.json({ message: 'Removed' });
});

module.exports = router;
