const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

const PROFILE_ITEM_TYPES = new Set(['experience', 'education', 'skills']);
const MAX_INLINE_URL_BYTES = {
  avatarUrl: 512 * 1024,
  coverUrl: 1024 * 1024,
  mediaUrl: 5 * 1024 * 1024,
};


function isLegacySchemaError(err) {
  return ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(err?.code);
}

function estimateDataUrlBytes(value) {
  if (typeof value !== 'string' || !value) return 0;
  const parts = value.split(',', 2);
  if (parts.length < 2) return 0;
  const [meta, payload] = parts;
  if (!/^data:/i.test(meta)) return 0;

  if (/;base64/i.test(meta)) {
    const normalized = payload.replace(/\s/g, '');
    const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
  }

  try {
    return Buffer.byteLength(decodeURIComponent(payload), 'utf8');
  } catch (_err) {
    return Buffer.byteLength(payload, 'utf8');
  }
}

function validateInlinePayloadSize(fieldName, value, maxBytes) {
  const estimatedBytes = estimateDataUrlBytes(value);
  if (estimatedBytes <= maxBytes) return null;
  return {
    status: 413,
    message: `${fieldName} is too large. Please upload a smaller file.`,
    estimatedBytes,
    maxBytes,
  };
}

function mapPayloadDbError(err) {
  if (err?.code === 'ER_NET_PACKET_TOO_LARGE') {
    return { status: 413, message: 'Uploaded content is too large. Please reduce file size and try again.' };
  }
  if (err?.code === 'ER_DATA_TOO_LONG') {
    return { status: 400, message: 'One or more fields exceed allowed length. Please shorten and try again.' };
  }
  return null;
}

function logDbError(route, err) {
  console.error('HIREHUB_DB_ERROR', {
    route,
    code: err?.code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage || err?.message,
  });
}

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
    let rows;
    try {
      [rows] = await pool.query(
        `SELECT u.id, u.full_name AS fullName, u.email, u.role, p.headline, p.location, p.about, p.resume_url AS resumeUrl, p.avatar_url AS avatarUrl, p.cover_url AS coverUrl
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [req.user.userId]
      );
    } catch (profileErr) {
      if (!isLegacySchemaError(profileErr)) throw profileErr;
      [rows] = await pool.query(
        `SELECT u.id, u.full_name AS fullName, u.email, u.role, p.headline, p.location, p.about
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = ?`,
        [req.user.userId]
      );
      rows = rows.map((r) => ({ ...r, resumeUrl: '', avatarUrl: '', coverUrl: '' }));
    }

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [itemsResult, postsResult] = await Promise.allSettled([
      pool.query(
        `SELECT item_type, item_value
         FROM profile_items
         WHERE user_id = ?
         ORDER BY id DESC`,
        [req.user.userId]
      ),
      (async () => {
        try {
          return await pool.query(
            `SELECT p.id, p.user_id, p.content, p.media_url, p.media_type, p.likes, p.comments, p.shares, p.created_at AS createdAt, u.full_name as fullName, pr.avatar_url as avatarUrl, pr.headline
             FROM posts p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN profiles pr ON pr.user_id = u.id
             ORDER BY p.created_at DESC`,
            []
          );
        } catch (postErr) {
          if (!isLegacySchemaError(postErr)) throw postErr;
          const [legacyPosts] = await pool.query(
            `SELECT p.id, p.user_id, p.content, p.likes, p.comments, p.shares, p.created_at AS createdAt, u.full_name as fullName, pr.headline
             FROM posts p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN profiles pr ON pr.user_id = u.id
             ORDER BY p.created_at DESC`,
            []
          );
          return [legacyPosts.map((post) => ({ ...post, media_url: null, media_type: null, avatarUrl: post.avatarUrl || '' }))];
        }
      })(),
    ]);

    const items = itemsResult.status === 'fulfilled' ? itemsResult.value[0] : [];
    const posts = postsResult.status === 'fulfilled' ? postsResult.value[0] : [];

    return res.json({
      ...rows[0],
      ...splitProfileItems(items),
      posts,
    });
  } catch (err) {
    logDbError('GET /api/user/me', err);
    return res.status(500).json({ message: 'Server error', error: err.message, code: err?.code });
  }
});

router.put('/profile', async (req, res) => {
  const { headline, location, about, resumeUrl, avatarUrl, coverUrl, experience, education, skills } = req.body;
  const profileItems = { experience, education, skills };
  const avatarPayloadError = validateInlinePayloadSize('avatarUrl', avatarUrl, MAX_INLINE_URL_BYTES.avatarUrl);
  if (avatarPayloadError) {
    return res.status(avatarPayloadError.status).json({ message: avatarPayloadError.message });
  }
  const coverPayloadError = validateInlinePayloadSize('coverUrl', coverUrl, MAX_INLINE_URL_BYTES.coverUrl);
  if (coverPayloadError) {
    return res.status(coverPayloadError.status).json({ message: coverPayloadError.message });
  }
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    try {
      await connection.query(
        `INSERT INTO profiles (user_id, headline, location, about, resume_url, avatar_url, cover_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           headline = VALUES(headline),
           location = VALUES(location),
           about = VALUES(about),
           resume_url = VALUES(resume_url),
           avatar_url = VALUES(avatar_url),
           cover_url = VALUES(cover_url)`,
        [req.user.userId, headline || '', location || '', about || '', resumeUrl || null, avatarUrl || null, coverUrl || null]
      );
    } catch (profileErr) {
      if (profileErr?.code !== 'ER_BAD_FIELD_ERROR') throw profileErr;
      await connection.query(
        `INSERT INTO profiles (user_id, headline, location, about)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           headline = VALUES(headline),
           location = VALUES(location),
           about = VALUES(about)`,
        [req.user.userId, headline || '', location || '', about || '']
      );
    }

    const warnings = [];
    for (const [type, values] of Object.entries(profileItems)) {
      if (!Array.isArray(values)) continue;
      try {
        await connection.query('DELETE FROM profile_items WHERE user_id = ? AND item_type = ?', [req.user.userId, type]);
        const cleanValues = [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
        if (!cleanValues.length) continue;
        const inserts = cleanValues.map((value) => [req.user.userId, type, value]);
        await connection.query('INSERT INTO profile_items (user_id, item_type, item_value) VALUES ?', [inserts]);
      } catch (itemErr) {
        if (!isLegacySchemaError(itemErr)) throw itemErr;
        warnings.push('Profile items not saved on legacy schema');
      }
    }

    await connection.commit();
    return res.json({ message: 'Profile updated', warnings: [...new Set(warnings)] });
  } catch (err) {
    await connection.rollback();
    const payloadDbError = mapPayloadDbError(err);
    if (payloadDbError) {
      return res.status(payloadDbError.status).json({ message: payloadDbError.message, code: err?.code });
    }
    logDbError('PUT /api/user/profile', err);
    return res.status(500).json({ message: 'Server error', error: err.message, code: err?.code });
  } finally {
    connection.release();
  }
});
//added 18 may
router.post('/posts', async (req, res) => {
  const content = String(req.body.content || '').trim();
  const mediaUrl = req.body.mediaUrl || null; 
  const mediaType = req.body.mediaType || null;

  if (!content && !mediaUrl) {
    return res.status(400).json({ message: 'Post content or media is required' });
  }

  try {
    // Inserts into both columns to ensure compatibility with your existing schema
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content, media_url, mediaUrl, media_type, likes, comments, shares) VALUES (?, ?, ?, ?, ?, 0, 0, 0)',
      [req.user.userId, content, mediaUrl, mediaUrl, mediaType]
    );

    return res.status(201).json({
      id: result.insertId,
      user_id: req.user.userId,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logDbError('POST /api/user/posts', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
//18may
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

router.post('/posts/:id/comment', async (req, res) => {
  const postId = Number(req.params.id);
  const { content, parentId } = req.body;
  
  if (!postId || !content) {
    return res.status(400).json({ message: 'Post id and comment content are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Saves the comment to the post_comments table
    const [result] = await connection.query(
      'INSERT INTO post_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.userId, parentId || null, content]
    );

    // Updates the count in the posts table
    await connection.query('UPDATE posts SET comments = comments + 1 WHERE id = ?', [postId]);

    await connection.commit();
    return res.status(201).json({ 
        id: result.insertId, 
        content, 
        postId, 
        parentId, 
        createdAt: new Date() 
    });
  } catch (err) {
    await connection.rollback();
    logDbError('POST /comment', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

    await connection.commit();
    const [[post]] = await pool.query('SELECT likes FROM posts WHERE id = ?', [postId]);
    return res.json({ message: 'Like toggled', likes: post.likes, liked: existing.length === 0 });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

router.post('/posts/:id/comment', async (req, res) => {
  const postId = Number(req.params.id);
  const { content, parentId } = req.body;
  if (!postId || !content) {
    return res.status(400).json({ message: 'Post id and comment content are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO post_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [postId, req.user.userId, parentId || null, content]
    );

    await connection.query('UPDATE posts SET comments = comments + 1 WHERE id = ?', [postId]);

    const [[postOwner]] = await connection.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postOwner && postOwner.user_id !== req.user.userId) {
      await connection.query('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)', [
        postOwner.user_id,
        'post_comment',
        `Your post #${postId} received a new comment.`
      ]);
    }

    await connection.commit();
    return res.status(201).json({ id: result.insertId, content, parentId, createdAt: new Date() });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
});

router.get('/posts/:id/comments', async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const [comments] = await pool.query(
      `SELECT c.*, u.full_name as fullName, p.avatar_url as avatarUrl
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [postId]
    );
    return res.json(comments);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/posts/:id/share', async (req, res) => {
  const postId = Number(req.params.id);
  const { shareType, sharedWithUserId } = req.body;

  try {
    await pool.query(
      'INSERT INTO post_shares (post_id, user_id, share_type, shared_with_user_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.userId, shareType, sharedWithUserId || null]
    );
    await pool.query('UPDATE posts SET shares = shares + 1 WHERE id = ?', [postId]);

    if (shareType === 'internal' && sharedWithUserId) {
      await pool.query('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)', [
        sharedWithUserId,
        'post_share',
        `A post was shared with you.`
      ]);
    }

    return res.json({ message: 'Post shared' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, full_name as fullName, email FROM users WHERE id != ?', [req.user.userId]);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const [[{ unread }]] = await pool.query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.userId]);
    const [items] = await pool.query(
      'SELECT id, type, message, is_read AS isRead, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.userId]
    );
    return res.json({ unread, items });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/notifications/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.userId]);
    return res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/posts/:id', async (req, res) => {
  const postId = Number(req.params.id);
  if (!postId) {
    return res.status(400).json({ message: 'Valid post id is required' });
  }

  try {
    const [result] = await pool.query('DELETE FROM posts WHERE id = ? AND user_id = ?', [postId, req.user.userId]);
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Post not found or unauthorized' });
    }
    return res.json({ message: 'Post deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/comments/:id', async (req, res) => {
  const commentId = Number(req.params.id);
  try {
    const [[comment]] = await pool.query('SELECT post_id FROM post_comments WHERE id = ? AND user_id = ?', [commentId, req.user.userId]);
    if (!comment) return res.status(404).json({ message: 'Comment not found or unauthorized' });

    await pool.query('DELETE FROM post_comments WHERE id = ?', [commentId]);
    await pool.query('UPDATE posts SET comments = GREATEST(0, comments - 1) WHERE id = ?', [comment.post_id]);

    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/comments/:id', async (req, res) => {
  const commentId = Number(req.params.id);
  const { content } = req.body;
  try {
    const [result] = await pool.query('UPDATE post_comments SET content = ? WHERE id = ? AND user_id = ?', [content, commentId, req.user.userId]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Comment not found or unauthorized' });
    return res.json({ message: 'Comment updated' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
