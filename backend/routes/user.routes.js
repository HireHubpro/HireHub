const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

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

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  const { headline, location, about } = req.body;

  try {
    await pool.query(
      'UPDATE profiles SET headline = ?, location = ?, about = ? WHERE user_id = ?',
      [headline || '', location || '', about || '', req.user.userId]
    );

    return res.json({ message: 'Profile updated' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
