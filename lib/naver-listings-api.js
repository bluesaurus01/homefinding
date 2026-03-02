// 네이버 부동산 매물 조회 공통 로직 (server.js / Vercel API 공용)
const axios = require('axios');
const cheerio = require('cheerio');

const M_LAND_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  Host: 'm.land.naver.com',
  Referer: 'https://m.land.naver.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function getValues(urlPath) {
  const parts = (urlPath || '').split('/').filter(Boolean);
  const segment = parts.find((s) => /^[\d.-]+:[\d.-]+:\d+:\d+$/.test(s));
  if (!segment) return [null, null, null, null];
  const p = segment.split(':');
  return [p[0], p[1], p[2], p[3] || null];
}

const REGION_COORD = {
  '원주시 무실동': { lat: 37.3316563, lng: 127.9498424 },
  '무실동': { lat: 37.3316563, lng: 127.9498424 },
  '원주시': { lat: 37.3422, lng: 127.9202 },
};

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
      timeout: 6000,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const finalUrl = res.request?.res?.responseUrl || res.request?.path || '';
    const path = finalUrl.startsWith('http') ? new URL(finalUrl).pathname : finalUrl || res.request?.path || '';
    const [lat, lon, z, cortarNo] = getValues(path);
    if (lat && lon) return { lat: parseFloat(lat), lng: parseFloat(lon), z: z || 14, cortarNo: cortarNo || null };
  } catch (_) {}
  return null;
}

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

async function getNaverLandListFromMLand({ location, lat, lng, tradeType, count }) {
  let coord = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng), cortarNo: null, z: 14 } : null;
  if (!coord) coord = await getCoordFromSearch(location);
  if (!coord) {
    const err = new Error(`해당 지역의 좌표를 찾을 수 없습니다. (지역: "${location}")`);
    err.reason = 'COORD_NOT_FOUND';
    throw err;
  }
  const { lat: latNum, lng: lngNum, cortarNo, z } = coord;
  const delta = 0.012;
  const btm = latNum - delta, top = latNum + delta, lft = lngNum - delta, rgt = lngNum + delta;
  const tradTpCd = (tradeType && tradeType.length ? tradeType : ['매매', '전세', '월세'])
    .map((t) => ({ 매매: 'A1', 전세: 'B1', 월세: 'B2' }[t] || 'A1')).join(':');
  const results = [];
  const seen = new Set();
  let page = 1;
  while (results.length < count) {
    const params = new URLSearchParams({
      z: String(z || 14), lat: String(latNum), lon: String(lngNum),
      btm: String(btm), top: String(top), lft: String(lft), rgt: String(rgt),
      rletTpCd: 'APT', tradTpCd: tradTpCd || 'A1:B1:B2',
      dprcMin: '0', dprcMax: '99999', wprcMin: '0', wprcMax: '99999', rprcMin: '0', rprcMax: '99999',
      sort: 'dateDesc', page: String(page),
    });
    if (cortarNo) params.set('cortarNo', cortarNo);
    const listUrl = `https://m.land.naver.com/cluster/ajax/articleList?${params.toString()}`;
    let res;
    try {
      res = await axios.get(listUrl, { headers: M_LAND_HEADERS, timeout: 6000, validateStatus: (s) => s === 200 });
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
    if (page > 2) break;
  }
  if (results.length === 0) {
    const err = new Error('해당 좌표(지역)에서 매물 목록이 0건입니다.');
    err.reason = 'NO_ARTICLE_IN_HTML';
    throw err;
  }
  return results;
}

/** 쿼리 파라미터로 매물 목록 반환 (Express req.query / Vercel req.query 공용) */
async function getList(query) {
  const { sido, gu, dong, type, lat, lng } = query || {};
  if (!sido || !gu) {
    const err = new Error('sido, gu 는 필수입니다.');
    err.reason = 'MISSING_PARAMS';
    throw err;
  }
  const location = [gu, dong].filter(Boolean).join(' ').trim() || gu;
  return getNaverLandListFromMLand({
    location,
    lat: lat || null,
    lng: lng || null,
    tradeType: type && type !== '전체' ? [type] : ['매매', '전세', '월세'],
    count: 30,
  });
}

module.exports = { getList, getNaverLandListFromMLand };
