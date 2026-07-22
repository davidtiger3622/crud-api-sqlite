// Task API — CRUD server for a to-do list, now backed by SQLite.
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi.json');
const db = require('./db');
const app = express();
const port = 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// Still in-memory for now — only /stats and /reset use this (not required
// by the assignment to be converted, can be left as-is or done as an extra).
// ---------------------------------------------------------------------------
const SEED_TASKS = [
  { id: 1, title: 'Buy groceries', done: false },
  { id: 2, title: 'Walk the dog', done: true },
  { id: 3, title: 'Read a book', done: false },
];

const tasks = SEED_TASKS.map((task) => ({ ...task }));

function resetTasks() {
  tasks.length = 0;
  tasks.push(...SEED_TASKS.map((task) => ({ ...task })));
}

// ---------------------------------------------------------------------------
// Swagger UI at /docs
// ---------------------------------------------------------------------------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks', '/stats', '/reset'],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// Stage 1 — Read (SQLite)
// ---------------------------------------------------------------------------
app.get('/tasks', (req, res) => {
  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];

  if (req.query.done !== undefined) {
    if (req.query.done !== 'true' && req.query.done !== 'false') {
      return res.status(400).json({ error: 'done must be true or false' });
    }
    conditions.push('done = ?');
    params.push(req.query.done === 'true' ? 1 : 0);
  }

  if (req.query.search !== undefined) {
    const word = String(req.query.search).trim();
    if (word === '') {
      return res.status(400).json({ error: 'search must not be empty' });
    }
    conditions.push('title LIKE ?');
    params.push(`%${word}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const rows = db.prepare(query).all(...params);
  const result = rows.map((t) => ({ ...t, done: Boolean(t.done) }));
  res.json(result);
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json({ ...task, done: Boolean(task.done) });
});

// ---------------------------------------------------------------------------
// Extras — stats, reset. Still in-memory.
// ---------------------------------------------------------------------------
app.get('/stats', (req, res) => {
  const done = tasks.filter((t) => t.done).length;
  res.json({
    total: tasks.length,
    done,
    open: tasks.length - done,
  });
});

app.post('/reset', (req, res) => {
  resetTasks();
  res.json(tasks);
});

// ---------------------------------------------------------------------------
// Stage 2 — Create (SQLite)
// ---------------------------------------------------------------------------
app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (title === undefined || title === null || String(title).trim() === '') {
    return res.status(400).json({ error: 'title is required and cannot be empty' });
  }

  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const result = insert.run(String(title).trim(), 0);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...task, done: Boolean(task.done) });
});

// ---------------------------------------------------------------------------
// Stage 3 — Update & Delete (SQLite)
// ---------------------------------------------------------------------------
app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body ?? {};
  const hasTitle = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'title');
  const hasDone = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'done');

  if (!hasTitle && !hasDone) {
    return res.status(400).json({ error: 'request body must include title and/or done' });
  }

  if (hasTitle && (title === null || String(title).trim() === '')) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  if (hasDone && typeof done !== 'boolean') {
    return res.status(400).json({ error: 'done must be a boolean' });
  }

  const newTitle = hasTitle ? String(title).trim() : existing.title;
  const newDone = hasDone ? (done ? 1 : 0) : existing.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ ...updated, done: Boolean(updated.done) });
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`CRUD API listening on port ${port}`);
});
