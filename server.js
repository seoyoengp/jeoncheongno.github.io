require('dotenv').config();
const express = require('express');
const path = require('path');
const notionHandler = require('./api/notion.js');

const app = express();
const port = 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '/')));

// API 라우팅 (Vercel 시뮬레이션)
app.get('/api/notion', async (req, res) => {
  try {
    await notionHandler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Local test server running at http://localhost:${port}`);
});
