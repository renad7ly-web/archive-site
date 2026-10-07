const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'archive_site',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

const UP = path.join(__dirname, 'uploads');
fs.mkdirSync(path.join(UP, 'tmp'), { recursive: true });
const ALLOWED = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.zip'];
const upload = multer({ dest: path.join(UP, 'tmp'), limits: { fileSize: 25 * 1024 * 1024 } });

// تنظيف المدخلات (Sanitization)
const clean = (s, n = 150) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const isInt = (v, min) => v !== '' && v != null && Number.isInteger(Number(v)) && Number(v) >= min;
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); });
const bad = (res, msg) => res.status(400).json({ error: msg });

// ---------- الأرشيف ----------
app.get('/api/archive', wrap(async (req, res) => {
  let sql = `SELECT f.id, f.title, f.original_name, f.file_size,
    DATE_FORMAT(f.archive_date, '%Y-%m-%d') AS archive_date, y.year
    FROM archive_files f JOIN years y ON y.id = f.year_id WHERE 1=1`;
  const p = [];
  const q = clean(req.query.q, 100);
  if (q) { sql += ' AND (f.title LIKE ? OR f.original_name LIKE ?)'; p.push(`%${q}%`, `%${q}%`); }
  if (isInt(req.query.year, 1900)) { sql += ' AND y.year = ?'; p.push(Number(req.query.year)); }
  sql += ' ORDER BY f.archive_date DESC, f.id DESC';
  const [rows] = await pool.execute(sql, p);
  res.json(rows);
}));

app.post('/api/archive', upload.single('file'), wrap(async (req, res) => {
  const f = req.file;
  const drop = () => f && fs.unlink(f.path, () => {});
  if (!f) return bad(res, 'اختر ملف');
  const date = String(req.body.date || '');
  const name = clean(Buffer.from(f.originalname, 'latin1').toString('utf8'), 200).replace(/[\\/]/g, '_');
  const title = clean(req.body.title) || name;
  const ext = path.extname(name).toLowerCase();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date))) { drop(); return bad(res, 'تاريخ غير صحيح'); }
  if (!ALLOWED.includes(ext)) { drop(); return bad(res, 'نوع الملف غير مسموح'); }
  const year = Number(date.slice(0, 4));
  await pool.execute('INSERT IGNORE INTO years (year) VALUES (?)', [year]);
  const [[y]] = await pool.execute('SELECT id FROM years WHERE year = ?', [year]);
  const dir = path.join(UP, String(year), date);
  fs.mkdirSync(dir, { recursive: true });
  const stored = path.join(String(year), date, crypto.randomBytes(8).toString('hex') + ext);
  fs.renameSync(f.path, path.join(UP, stored));
  await pool.execute(
    'INSERT INTO archive_files (year_id, title, original_name, stored_path, file_type, file_size, archive_date) VALUES (?,?,?,?,?,?,?)',
    [y.id, title, name, stored, ext.slice(1), f.size, date]);
  res.json({ ok: true });
}));

app.get('/api/archive/:id/download', wrap(async (req, res) => {
  const [[r]] = await pool.execute('SELECT stored_path FROM archive_files WHERE id = ?', [Number(req.params.id)]);
  if (!r) return bad(res, 'الملف غير موجود');
  const abs = path.resolve(UP, r.stored_path);
  if (!abs.startsWith(UP + path.sep) || !fs.existsSync(abs)) return bad(res, 'الملف غير موجود');
  res.sendFile(abs);
}));

app.delete('/api/archive/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [[r]] = await pool.execute('SELECT stored_path FROM archive_files WHERE id = ?', [id]);
  if (!r) return bad(res, 'الملف غير موجود');
  const abs = path.resolve(UP, r.stored_path);
  if (abs.startsWith(UP + path.sep)) fs.unlink(abs, () => {});
  await pool.execute('DELETE FROM archive_files WHERE id = ?', [id]);
  res.json({ ok: true });
}));

app.get('/schema.sql', (req, res) => res.sendFile(path.join(__dirname, 'schema.sql')));
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف أكبر من 25 ميجا' : 'طلب غير صحيح');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
