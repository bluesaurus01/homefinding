// Vercel Serverless Function: GET /api/naver-listings
const { getList } = require('../../lib/naver-listings-api');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const list = await getList(req.query);
    res.status(200).json(list);
  } catch (e) {
    const reason = e.reason || 'UNKNOWN';
    if (reason === 'MISSING_PARAMS') {
      return res.status(400).json({
        error: 'sido, gu 는 필수입니다.',
        detail: e.message,
        reason,
      });
    }
    res.status(500).json({
      error: '네이버 부동산 조회 실패',
      detail: e.message,
      reason,
    });
  }
};
