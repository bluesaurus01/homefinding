// Vercel 빌드 시 BACKEND_URL 환경 변수로 config.js 생성 (프론트가 외부 백엔드 호출)
const fs = require('fs');
const path = require('path');
const url = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
const safe = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const content = `// Generated at build time. Set BACKEND_URL in Vercel to use an external API.
window.APP_BACKEND_URL = "${safe}";
`;
fs.writeFileSync(path.join(__dirname, '..', 'config.js'), content, 'utf8');
console.log('config.js written (BACKEND_URL:', url || '(empty)', ')');
