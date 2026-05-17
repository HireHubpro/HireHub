const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Helper for error logging
const logDbError = (route, err) => {
  console.error(`HIREHUB_DB_ERROR [${route}]:`, err.sqlMessage || err.message);
};

// --- GET PROFILE & POSTS ---
router.get('/me', async (req, res) => {
  try {
    const [userRows] = await pool.query(
      `SELECT u.id, u.full_name AS fullName, u.role, p.headline, p.location, p.about, 
              p.avatar_url AS avatarUrl, p.cover_url AS coverUrl
       FROM users u 
       LEFT JOIN profiles p ON p.user_id = u.id 
       WHERE u.id = ?`,
      [req.user.userId]
    );

    const [posts] = await pool.query(
      `SELECT p.*, u.full_name as fullName, pr.avatar_url as avatarUrl 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN profiles pr ON pr.user_id = u.id 
       ORDER BY p.created_at DESC`
    );

    if (!userRows.length) return res.status(404).json({ message: 'User not found' });
    
    // Fetch profile items (skills, education, etc)
    const [items] = await pool.query(
      'SELECT item_type, item_value FROM profile_items WHERE user_id = ?',
      [req.user.userId]
    );

    const profileData = items.reduce((acc, item) => {
      if (!acc[item.item_type]) acc[item.item_type] = [];
      acc[item.item_type].push(item.item_value);
      return acc;
    }, { experience: [], education: [], skills: [] });

    res.json({ ...userRows[0], ...profileData, posts });
  } catch (err) {
    logDbError('GET /me', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- UPDATE PROFILE ---
router.put('/profile', async (req, res) => {
  const { headline, location, about, avatarUrl, coverUrl, experience, education, skills } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO profiles (user_id, headline, location, about, avatar_url, cover_url)
       VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
       headline=VALUES(headline), location=VALUES(location), about=VALUES(about), 
       avatar_url=VALUES(avatar_url), cover_url=VALUES(cover_url)`,
      [req.user.userId, headline, location, about, avatarUrl, coverUrl]
    );

    const items = { experience, education, skills };
    for (const [type, values] of Object.entries(items)) {
      await conn.query('DELETE FROM profile_items WHERE user_id = ? AND item_type = ?', [req.user.userId, type]);
      if (Array.isArray(values) && values.length > 0) {
        const insertValues = values.map(v => [req.user.userId, type, v]);
        await conn.query('INSERT INTO profile_items (user_id, item_type, item_value) VALUES ?', [insertValues]);
      }
    }
    await conn.commit();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    await conn.rollback();
    logDbError('PUT /profile', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
});

// --- CREATE POST (Fixed Image Logic) ---
router.post('/posts', async (req, res) => {
  const { content, mediaUrl, mediaType } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO posts (user_id, content, media_url, mediaUrl, media_type, likes, comments, shares) 
       VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
      [req.user.userId, content || '', mediaUrl, mediaUrl, mediaType]
    );
    res.status(201).json({ id: result.insertId, content, mediaUrl });
  } catch (err) {
    logDbError('POST /posts', err);
    res.status(500).json({ message: 'Error creating post', error: err.message });
  }
});

// --- CREATE COMMENT ---
router.post('/posts/:id/comment', async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)', [postId, req.user.userId, content]);
    await conn.query('UPDATE posts SET comments = comments + 1 WHERE id = ?', [postId]);
    
    // Notification logic
    const [[owner]] = await conn.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (owner && owner.user_id !== req.user.userId) {
      await conn.query('INSERT INTO notifications (user_id, type, message) VALUES (?, "comment", ?)', 
      [owner.user_id, `New comment on your post: ${content.substring(0, 20)}`]);
    }

    await conn.commit();
    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    await conn.rollback();
    logDbError('POST /comment', err);
    res.status(500).json({ message: 'Error' });
  } finally {
    conn.release();
  }
});

// --- LIKE POST ---
router.put('/posts/:id/like', async (req, res) => {
  try {
    await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

// --- DELETE POST ---
router.delete('/posts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

// --- GET NOTIFICATIONS ---
router.get('/notifications', async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.userId]);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

module.exports = router;
