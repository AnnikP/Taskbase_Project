const express = require('express');
const router  = express.Router();
const List    = require('../models/List');
const Task    = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

// All list routes require auth
router.use(requireAuth);

// GET /api/lists  — fetch all lists for the logged-in user
router.get('/', async (req, res) => {
  try {
    const lists = await List.find({ owner: req.session.userId }).sort({ createdAt: 1 });
    return res.json(lists);
  } catch (err) {
    console.error('Get lists error:', err);
    return res.status(500).json({ error: 'Server error fetching lists.' });
  }
});

// POST /api/lists  — create a new list
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'List title is required.' });
    }

    const list = await List.create({
      title: title.trim(),
      owner: req.session.userId
    });

    return res.status(201).json(list);
  } catch (err) {
    console.error('Create list error:', err);
    return res.status(500).json({ error: 'Server error creating list.' });
  }
});

// PATCH /api/lists/:id  — rename a list
router.patch('/:id', async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!list) return res.status(404).json({ error: 'List not found.' });

    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    list.title = title.trim();
    await list.save();
    return res.json(list);
  } catch (err) {
    console.error('Update list error:', err);
    return res.status(500).json({ error: 'Server error updating list.' });
  }
});

// DELETE /api/lists/:id  — delete a list and all its tasks
router.delete('/:id', async (req, res) => {
  try {
    const list = await List.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!list) return res.status(404).json({ error: 'List not found.' });

    // Cascade-delete all tasks in this list
    await Task.deleteMany({ list: list._id });
    await list.deleteOne();

    return res.json({ message: 'List and its tasks deleted.' });
  } catch (err) {
    console.error('Delete list error:', err);
    return res.status(500).json({ error: 'Server error deleting list.' });
  }
});

module.exports = router;