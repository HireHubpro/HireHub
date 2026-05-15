const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); app.use('/api', userRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/health', (_, res) => res.json({ ok: true }));


app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Uploaded file is too large. Please choose a smaller file.' });
  }
  if (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
  return next();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`HireHub running at http://localhost:${PORT}`);
});
