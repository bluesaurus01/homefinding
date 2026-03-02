// 네이버 부동산 매물 조회 (m.land) — 로컬/배포용 Express 서버
// Run: node server.js

const express = require('express');
const { getList } = require('./lib/naver-listings-api');

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/api/naver-listings', async (req, res) => {
  try {
    const list = await getList(req.query);
    res.json(list);
  } catch (e) {
    console.error('Naver backend error:', e.reason || e.message, e.message);
    res.status(500).json({
      error: '네이버 부동산 조회 실패',
      detail: e.message,
      reason: e.reason || 'UNKNOWN',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Naver backend (m.land) listening on http://localhost:${PORT}`);
});
