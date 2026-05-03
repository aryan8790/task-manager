const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/users',    require('./routes/users'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDB().then(() =>
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 TaskFlow running → http://localhost:${PORT}`))
).catch(e => { console.error(e); process.exit(1); });
