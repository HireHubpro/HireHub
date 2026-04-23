const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const PROFILE_ITEM_TYPES = new Set(['experience', 'education', 'skills']);

function splitProfileItems(rows) {
  return rows.reduce(
    (acc, row) => {
      if (PROFILE_ITEM_TYPES.has(row.item_type)) {
        acc[row.item_type].push(row.item_value);
      }
      return acc;
    },
    { experience: [], education: [], skills: [] }
  );
}

router.get('/me', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name AS fullName, u.email, u.role, p.headline, p.location, p.about
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [[items], [posts]] = await Promise.all([
      pool.query(
        `SELECT item_type, item_value
         FROM profile_items
         WHERE user_id = ?
         ORDER BY id DESC`,
        [req.user.userId]
      ),
      pool.query(
        `SELECT id, content, likes, comments, created_at AS createdAt
         FROM posts
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [req.user.userId]
      ),
    ]);

    return res.json({
      ...rows[0],
      ...splitProfileItems(items),
      posts,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  const { headline, location, about, experience, education, skills } = req.body;
  const profileItems = { experience, education, skills };
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      'UPDATE profiles SET headline = ?, location = ?, about = ? WHERE user_id = ?',
      [headline || '', location || '', about || '', req.user.userId]
    );

    for (const [type, values] of Object.entries(profileItems)) {
      if (!Array.isArray(values)) continue;
      await connection.query('DELETE FROM profile_items WHERE user_id = ? AND item_type = ?', [req.user.userId, type]);
      const cleanValues = [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
      if (!cleanValues.length) continue;
      const inserts = cleanValues.map((value) => [req.user.userId, type, value]);
      await connection.query('INSERT INTO profile_items (user_id, item_type, item_value) VALUES ?', [inserts]);
    }

    await connection.commit();
    return res.json({ message: 'Profile updated' });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

router.post('/posts', async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ message: 'Post content is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content, likes, comments) VALUES (?, ?, 0, 0)',
      [req.user.userId, content]
    );
    return res.status(201).json({
      id: result.insertId,
      content,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/posts/:id', async (req, res) => {
  const postId = Number(req.params.id);
  const content = String(req.body.content || '').trim();
  if (!postId || !content) {
    return res.status(400).json({ message: 'Valid post id and content are required' });
  }

  try {
    const [result] = await pool.query('UPDATE posts SET content = ? WHERE id = ? AND user_id = ?', [
      content,
      postId,
      req.user.userId,
    ]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.json({ message: 'Post updated' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
