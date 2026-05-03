const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDB } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  const db = getDB();
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email already registered' });

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const role  = count === 0 ? 'admin' : 'member';   // first user is admin
  const hash  = bcrypt.hashSync(password, 10);
  const r     = db.prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)').run(name, email.toLowerCase(), hash, role);
  const user  = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(r.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const db   = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const { password: _, ...safe } = user;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safe });
});

router.get('/me', authenticate, (req, res) => {
  const user = getDB().prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(req.user.id);
  user ? res.json(user) : res.status(404).json({ error: 'User not found' });
});

module.exports = router;
