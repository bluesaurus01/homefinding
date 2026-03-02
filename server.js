// 네이버 부동산 매물 조회 (m.land.naver.com cluster/ajax/articleList + bbox)
// Run: node server.js

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// new.land.naver.com 요청 헤더 (개발자 도구에서 보이는 것과 동일하게)
const NEW_LAND_HEADERS = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Connection: 'keep-alive',
  Host: 'new.land.naver.com',
  Referer: 'https://new.land.naver.com/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

const M_LAND_HEADERS = {
  ...NEW_LAND_HEADERS,
  Host: 'm.land.naver.com',
  Referer: 'https://m.land.naver.com/',
};

function getValues(urlPath) {
  const parts = (urlPath || '').split('/').filter(Boolean);
  const segment = parts.find((s) => /^[\d.-]+:[\d.-]+:\d+:\d+$/.test(s));
  if (!segment) return [null, null, null, null];
  const p = segment.split(':');
  return [p[0], p[1], p[2], p[3] || null];
}

// 지역별 좌표 폴백 (new.land 검색 결과 URL과 동일하게 사용)
const REGION_COORD = {
  '원주시 무실동': { lat: 37.3316563, lng: 127.9498424 },
  '무실동': { lat: 37.3316563, lng: 127.9498424 },
  '원주시': { lat: 37.3422, lng: 127.9202 },
};

// 지역명 → 좌표·cortarNo: 폴백 테이블 → m.land 검색 리다이렉트
async function getCoordFromSearch(location) {
  const key = String(location).trim();
  if (REGION_COORD[key]) return { ...REGION_COORD[key], cortarNo: null, z: 14 };

  const loc = encodeURIComponent(key);
  if (!loc) return null;
  const searchUrl = `https://m.land.naver.com/search/result/${loc}`;
  try {
    const res = await axios.get(searchUrl, {
      headers: M_LAND_HEADERS,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const finalUrl = res.request?.res?.responseUrl || res.request?.path || '';
    const path = finalUrl.startsWith('http') ? new URL(finalUrl).pathname : finalUrl || res.request?.path || '';
    const [lat, lon, z, cortarNo] = getValues(path);
    if (lat && lon) return { lat: parseFloat(lat), lng: parseFloat(lon), z: z || 14, cortarNo: cortarNo || null };
  } catch (_) {}
  return null;
}

// 한글 가격 문자열 → 만원 단위 정수 (억·천만·백만·만·천 단위 인식)
// 예: "2억 4천만" → 24000, "2억4000만" → 24000, "1억 2천5백만" → 12500, "4500만" → 4500
function parseManOnly(str) {
  let rest = (str || '').replace(/만원?$/g, '').replace(/만$/g, '').trim();
  if (/^\d+$/.test(rest)) return parseInt(rest, 10) || 0;
  let manVal = 0;
  const c = rest.match(/(\d+)천/);
  if (c) { manVal += parseInt(c[1], 10) * 1000; rest = rest.replace(/(\d+)천/, ''); }
  const b = rest.match(/(\d+)백/);
  if (b) { manVal += parseInt(b[1], 10) * 100; rest = rest.replace(/(\d+)백만?/, ''); }
  const s = rest.match(/(\d+)십/);
  if (s) { manVal += parseInt(s[1], 10) * 10; rest = rest.replace(/(\d+)십/, ''); }
  const remaining = rest.replace(/\D/g, '');
  if (remaining) manVal += parseInt(remaining, 10);
  return manVal;
}

function parsePriceMan(hanPrc) {
  if (!hanPrc || typeof hanPrc !== 'string') return 0;
  try {
    const raw = hanPrc.replace(/,/g, '').replace(/\s/g, '');
    if (!raw.includes('억')) return parseManOnly(raw);
    const parts = raw.split('억');
    let priceMan = (parseInt(parts[0], 10) || 0) * 10000;
    if (parts[1]) priceMan += parseManOnly(parts[1]);
    return priceMan;
  } catch (_) {}
  return 0;
}

// HTML에서 __NEXT_DATA__ 또는 window.__PRELOADED_STATE__ 등 JSON 추출
function extractEmbeddedJson(html) {
  const $ = cheerio.load(html);
  let data = null;

  const nextData = $('script#__NEXT_DATA__').html();
  if (nextData) {
    try {
      data = JSON.parse(nextData);
    } catch (_) {}
  }

  const body = $('body').html() || '';
  if (!data) {
    const match = body.match(/<script[^>]*>[\s\S]*?window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (match) {
      try {
        data = { __PRELOADED_STATE__: JSON.parse(match[1]) };
      } catch (_) {}
    }
  }

  if (!data) {
    const match = body.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (match) {
      try {
        data = { __INITIAL_STATE__: JSON.parse(match[1]) };
      } catch (_) {}
    }
  }

  return data;
}

// 중첩 객체에서 articleList / complexList / list 등 배열 찾기
function findArticleLists(obj, out, depth = 0) {
  if (depth > 15 || !obj) return;
  if (Array.isArray(obj)) {
    const first = obj[0];
    if (first && typeof first === 'object' && (first.articleNo || first.atclNo || first.articleName || first.atclNm)) {
      out.push(obj);
    }
    return;
  }
  if (typeof obj !== 'object') return;
  const keys = ['articleList', 'articles', 'list', 'complexList', 'complexes', 'body', 'data'];
  for (const k of keys) {
    if (obj[k] && Array.isArray(obj[k])) {
      const first = obj[k][0];
      if (first && typeof first === 'object') out.push(obj[k]);
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) findArticleLists(v, out, depth + 1);
  }
}

// API 응답 한 건을 우리 매물 형식으로 변환
function toListingItem(it, idx, location) {
  const tradeName = (it.tradTpNm || it.tradeTypeName || it.realEstateTypeName || '').toString();
  const type = tradeName.indexOf('매매') !== -1 ? '매매' : tradeName.indexOf('전세') !== -1 ? '전세' : tradeName.indexOf('월세') !== -1 ? '월세' : '매매';

  let price = 0;
  let deposit = 0;
  const prc = it.dealOrWarrantPrc || it.hanPrc || it.price || '';
  if (typeof prc === 'number') price = prc;
  else price = parsePriceMan(String(prc));
  if (type === '월세' && (it.rentPrc != null || it.monthlyRent != null)) {
    deposit = price;
    price = Number(it.rentPrc || it.monthlyRent || 0);
  }

  const area = it.area1 || it.spc1 || it.areaName || 0;
  const size = Number(area) || 0;

  return {
    id: idx + 1,
    articleNo: it.articleNo || it.atclNo,
    name: (it.articleName || it.atclNm || it.realEstateTypeName || '네이버 매물').trim(),
    location: (it.cortarAddr || it.address || location || '').trim(),
    type,
    price,
    deposit,
    size: Math.round(size),
    floor: it.floorInfo || it.flrInfo || '',
    year: Number(it.articleConfirmYmd ? String(it.articleConfirmYmd).slice(0, 4) : 0) || 0,
    lat: it.lat || null,
    lng: it.lng || null,
    description: (it.tagList && it.tagList.join) ? it.tagList.join(', ') : '',
  };
}

// m.land.naver.com cluster/ajax/articleList 사용 (bbox 필수)
async function getNaverLandListFromMLand({ location, lat, lng, tradeType, count }) {
  let coord = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng), cortarNo: null, z: 14 } : null;
  if (!coord) coord = await getCoordFromSearch(location);
  if (!coord) {
    const err = new Error(`해당 지역의 좌표를 찾을 수 없습니다. (지역: "${location}") m.land 검색 리다이렉트에서 좌표를 추출하지 못했거나, 등록된 폴백 좌표가 없습니다.`);
    err.reason = 'COORD_NOT_FOUND';
    throw err;
  }

  const { lat: latNum, lng: lngNum, cortarNo, z } = coord;
  const delta = 0.012;
  const btm = latNum - delta;
  const top = latNum + delta;
  const lft = lngNum - delta;
  const rgt = lngNum + delta;

  const tradTpCd = (tradeType && tradeType.length ? tradeType : ['매매', '전세', '월세'])
    .map((t) => ({ 매매: 'A1', 전세: 'B1', 월세: 'B2' }[t] || 'A1'))
    .join(':');

  const results = [];
  const seen = new Set();
  let page = 1;

  while (results.length < count) {
    const params = new URLSearchParams({
      z: String(z || 14),
      lat: String(latNum),
      lon: String(lngNum),
      btm: String(btm),
      top: String(top),
      lft: String(lft),
      rgt: String(rgt),
      rletTpCd: 'APT',
      tradTpCd: tradTpCd || 'A1:B1:B2',
      dprcMin: '0',
      dprcMax: '99999',
      wprcMin: '0',
      wprcMax: '99999',
      rprcMin: '0',
      rprcMax: '99999',
      sort: 'dateDesc',
      page: String(page),
    });
    if (cortarNo) params.set('cortarNo', cortarNo);

    const listUrl = `https://m.land.naver.com/cluster/ajax/articleList?${params.toString()}`;
    let res;
    try {
      res = await axios.get(listUrl, {
        headers: M_LAND_HEADERS,
        timeout: 12000,
        validateStatus: (s) => s === 200,
      });
    } catch (e) {
      const err = new Error(e.code === 'ECONNREFUSED' ? '네이버 서버에 연결할 수 없습니다.' : (e.message || 'articleList 요청 실패'));
      err.reason = 'NETWORK_OR_REQUEST';
      throw err;
    }

    const body = res.data && res.data.body;
    if (!Array.isArray(body) || body.length === 0) break;

    for (const it of body) {
      if (results.length >= count) break;
      const no = it.atclNo || it.articleNo;
      if (no && seen.has(no)) continue;
      if (no) seen.add(no);
      results.push(toListingItemMLand(it, results.length, location));
    }

    const hasMore = res.data && res.data.more;
    if (!hasMore || body.length < 20) break;
    page += 1;
    if (page > 10) break;
  }

  if (results.length === 0) {
    const err = new Error('해당 좌표(지역)에서 매물 목록이 0건입니다. bbox 범위를 넓히거나 다른 지역을 선택해보세요.');
    err.reason = 'NO_ARTICLE_IN_HTML';
    throw err;
  }

  return results;
}

// m.land articleList 한 건 → 우리 형식
function toListingItemMLand(it, idx, location) {
  const tradeName = (it.tradTpNm || '').toString();
  const type = tradeName.indexOf('매매') !== -1 ? '매매' : tradeName.indexOf('전세') !== -1 ? '전세' : tradeName.indexOf('월세') !== -1 ? '월세' : '매매';
  const hanPrc = it.hanPrc || '';
  const priceMan = parsePriceMan(hanPrc);
  const area1 = Number(it.spc1 || it.area1 || 0);
  const sizePyeong = area1 > 0 ? Math.round((area1 / 3.305785) * 10) / 10 : 0;

  return {
    id: idx + 1,
    articleNo: it.atclNo,
    name: (it.atclNm || '네이버 매물').trim(),
    location: (it.cortarAddr || location || '').trim(),
    type,
    price: type === '월세' ? 0 : priceMan,
    deposit: type === '월세' ? priceMan : 0,
    size: sizePyeong || Math.round(area1),
    floor: it.flrInfo || '',
    year: 0,
    lat: it.lat || null,
    lng: it.lng || null,
    description: (it.tagList && it.tagList.join) ? it.tagList.join(', ') : '',
  };
}

app.get('/api/naver-listings', async (req, res) => {
  const { sido, gu, dong, type, lat, lng } = req.query;
  if (!sido || !gu) {
    return res.status(400).json({ error: 'sido, gu 는 필수입니다.', detail: 'sido, gu 쿼리 파라미터를 넣어주세요.', reason: 'MISSING_PARAMS' });
  }

  const location = [gu, dong].filter(Boolean).join(' ').trim() || gu;

  try {
    const list = await getNaverLandListFromMLand({
      location,
      lat: lat || null,
      lng: lng || null,
      tradeType: type && type !== '전체' ? [type] : ['매매', '전세', '월세'],
      count: 50,
    });
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
