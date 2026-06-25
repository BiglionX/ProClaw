const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, 'uploads/') });
if (!fs.existsSync(path.join(__dirname, 'uploads/'))) fs.mkdirSync(path.join(__dirname, 'uploads/'));

const TEMPLATES = [
  { id: 'tpl_1', title: '餐饮新品推广', scenes: ['开场口播', '菜品特写', '环境展示', '优惠信息'] },
  { id: 'tpl_2', title: '美业门店宣传', scenes: ['店铺介绍', '服务展示', '效果前后', '优惠卡片'] },
];

const tasks = {}; // in-memory task store

app.get('/api/proclips/templates', (req, res) => {
  res.json({ templates: TEMPLATES });
});

app.post('/api/proclips/upload-scene', upload.single('file'), (req, res) => {
  const { template_id, scene_index } = req.body;
  const file = req.file;
  const remoteUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  res.json({ remoteUrl, template_id, scene_index });
});

app.post('/api/proclips/generate-upload-url', (req, res) => {
  const { template_id, scene_index, fileName } = req.body || {};
  const filename = fileName || `scene_${Date.now()}.mp4`;
  const key = `presign_${Date.now()}_${Math.random().toString(36).slice(2,8)}_${filename}`;
  const uploadUrl = `${req.protocol}://${req.get('host')}/uploads/${key}`;
  res.json({ uploadUrl, key });
});

app.post('/api/proclips/confirm-scene-upload', (req, res) => {
  const { template_id, scene_index, key } = req.body || {};
  // In mock, confirmation is a no-op
  res.json({ ok: true, key, template_id, scene_index });
});

// Accept PUT upload to /uploads/:filename and write body to disk
app.put('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const dest = path.join(__dirname, 'uploads', filename);
  const writeStream = fs.createWriteStream(dest);
  req.pipe(writeStream);
  req.on('end', () => {
    res.status(200).json({ remoteUrl: `${req.protocol}://${req.get('host')}/uploads/${filename}` });
  });
  req.on('error', (err) => {
    res.status(500).json({ error: String(err) });
  });
});

app.post('/api/proclips/record-voice', upload.single('file'), (req, res) => {
  const file = req.file;
  const remoteUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  res.json({ remoteUrl });
});

app.post('/api/proclips/mix/submit', (req, res) => {
  const taskId = `mock_${uuidv4()}`;
  tasks[taskId] = { taskId, status: 'processing', progress: 0, createdAt: Date.now() };
  // simulate progress in background
  const interval = setInterval(() => {
    const t = tasks[taskId];
    if (!t) return clearInterval(interval);
    t.progress = Math.min(1, t.progress + Math.random() * 0.25);
    if (t.progress >= 1) {
      t.status = 'completed';
      t.resultVideoUrl = `${req.protocol}://${req.get('host')}/uploads/${taskId}.mp4`;
      clearInterval(interval);
    }
  }, 2000);

  res.json({ taskId, status: 'processing' });
});

app.get('/api/proclips/mix/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const t = tasks[taskId];
  if (!t) return res.status(404).json({ error: 'task not found' });
  res.json({ status: t.status, progress: t.progress, resultVideoUrl: t.resultVideoUrl });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`ProClips mock backend listening on http://localhost:${port}`));
