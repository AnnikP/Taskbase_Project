const express = require('express');
const router  = express.Router();
const Task    = require('../models/Task');
const List    = require('../models/List');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/tasks/search?q=keyword  — search across all user tasks
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const tasks = await Task.find({
      owner: req.session.userId,
      title: { $regex: q, $options: 'i' }
    })
      .populate('list', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(tasks);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Server error during search.' });
  }
});

// GET /api/tasks?listId=xxx  — get all tasks for a specific list
router.get('/', async (req, res) => {
  try {
    const { listId } = req.query;
    if (!listId) return res.status(400).json({ error: 'listId query param required.' });

    // Verify ownership of the list
    const list = await List.findOne({ _id: listId, owner: req.session.userId });
    if (!list) return res.status(404).json({ error: 'List not found.' });

    const tasks = await Task.find({ list: listId, owner: req.session.userId }).sort({ createdAt: 1 });
    return res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    return res.status(500).json({ error: 'Server error fetching tasks.' });
  }
});

// POST /api/tasks  — create a new task in a list
router.post('/', async (req, res) => {
  try {
    const { title, listId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }
    if (!listId) {
      return res.status(400).json({ error: 'listId is required.' });
    }

    // Verify ownership of the list
    const list = await List.findOne({ _id: listId, owner: req.session.userId });
    if (!list) return res.status(404).json({ error: 'List not found.' });

    const task = await Task.create({
      title: title.trim(),
      list: listId,
      owner: req.session.userId
    });

    return res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Server error creating task.' });
  }
});

// PATCH /api/tasks/:id  — toggle complete or rename a task
router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (req.body.completed !== undefined) task.completed = req.body.completed;
    if (req.body.title    !== undefined) task.title     = req.body.title.trim();

    await task.save();
    return res.json(task);
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Server error updating task.' });
  }
});

// DELETE /api/tasks/:id  — delete a single task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    await task.deleteOne();
    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ error: 'Server error deleting task.' });
  }
});

module.exports = router;