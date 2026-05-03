const express = require('express');
const { getDB } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) =>
  res.json(getDB().prepare('SELECT id,name,email,role,created_at FROM users ORDER BY name').all()));

router.get('/:id', (req, res) => {
  const u = getDB().prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(req.params.id);
  u ? res.json(u) : res.status(404).json({ error: 'User not found' });
});

router.put('/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
  const u = getDB().prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  getDB().prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const u = getDB().prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  getDB().prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
