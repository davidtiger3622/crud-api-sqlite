// Task API — CRUD server for a to-do list.
// Stage 1: GET routes now read from SQLite. Write routes still in-memory (Stage 2/3 next).
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi.json');
const db = require('./db');
const app = express();
const port = 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory array — still backs POST/PUT/DELETE/reset until Stage 2/3 convert them.
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
// Stage 1 — Read: now backed by SQLite
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
// Extras — stats, reset. Still in-memory for now — Stage 2/3 will convert.
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
// Stage 3 (not yet converted) — Create. Still in-memory.
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
// Update & Delete. Still in-memory — Stage 3 next.
// ---------------------------------------------------------------------------
app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body ?? {};
  const hasTitle = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'title');
  const hasDone = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'done');

  if (!hasTitle && !hasDone) {
    return res.status(400).json({ error: 'request body must include title and/or done' });
  }

  if (hasTitle) {
    if (title === null || String(title).trim() === '') {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    task.title = String(title).trim();
  }

  if (hasDone) {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'done must be a boolean' });
    }
    task.done = done;
  }

  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`CRUD API listening on port ${port}`);
});
