# HTML App – Run & Deploy

## Run locally

1. **Option A – npm (recommended)**  
   From this folder:
   ```bash
   cd html-app
   npm start
   ```
   Then open: **http://localhost:3080**

2. **Option B – Python (no Node needed)**  
   ```bash
   cd html-app
   python3 -m http.server 3080
   ```
   Then open: **http://localhost:3080**

**지도 탭 (네이버 지도)**  
지도 탭에서 네이버 지도를 쓰려면 [네이버 클라우드 플랫폼 Maps](https://console.ncloud.com/maps/application)에서 **Maps** API 키(ncpKeyId)를 발급한 뒤, 앱 좌측 설정에서 "지도 (네이버 지도 API)" 항목에 키를 입력·저장하세요. 사용할 도메인(예: `localhost`, 배포 URL)을 콘솔에 등록해야 합니다.

3. **Option C – Open file directly**  
   Double‑click `index.html` or run:
   ```bash
   open index.html
   ```
   (Some features may not work with `file://`.)

---

## GitHub에 프로젝트 올리고 저장소 연결하기

Render 등에서 **저장소 연결**로 배포하려면, 먼저 이 프로젝트를 GitHub에 올려야 합니다.

### 1. GitHub에서 새 저장소 만들기

1. [github.com](https://github.com) 로그인 후 오른쪽 상단 **+** → **New repository** 클릭.
2. **Repository name**에 원하는 이름 입력 (예: `jibjaba` 또는 `html-app`).
3. **Public** 선택, **Add a README file**는 체크하지 않아도 됩니다 (아래에서 로컬 파일을 올릴 예정이므로).
4. **Create repository** 클릭.
5. 생성된 페이지에서 **저장소 URL**을 복사합니다.  
   - HTTPS: `https://github.com/내아이디/저장소이름.git`  
   - SSH: `git@github.com:내아이디/저장소이름.git`

### 2. 로컬에서 Git 초기화 후 올리기

프로젝트 폴더(`html-app`이 있는 위치)에서 터미널을 연 뒤, 아래를 순서대로 실행하세요.

```bash
# 1) html-app 폴더로 이동 (이미 그 안에 있다면 생략)
cd html-app

# 2) Git이 아직 없다면 초기화
git init

# 3) GitHub 저장소를 원격(remote)으로 추가 (URL은 본인 저장소 주소로 바꾸세요)
git remote add origin https://github.com/내아이디/저장소이름.git

# 4) 모든 파일 스테이징
git add .

# 5) 첫 커밋
git commit -m "Initial commit: 집잡아 v3"

# 6) GitHub에 올리기 (기본 브랜치가 main이 아닐 수 있으면 아래에서 main으로 푸시)
git branch -M main
git push -u origin main
```

- **Git이 설치되어 있지 않다면**: [git-scm.com](https://git-scm.com/)에서 설치 후 다시 시도.
- **푸시 시 로그인 요청**: GitHub 아이디·비밀번호 대신 **Personal Access Token**을 쓰는 경우가 많습니다.  
  GitHub → **Settings → Developer settings → Personal access tokens**에서 토큰을 만들고, 비밀번호 자리에 토큰을 입력하면 됩니다.

### 3. 연결 확인

GitHub 저장소 페이지를 새로고침했을 때 `index.html`, `server.js`, `package.json` 등이 보이면 연결이 완료된 것입니다. 이제 Render에서 **New → Web Service**로 들어가 **Connect a repository**로 이 저장소를 선택하면 됩니다.

---

## Deploy (put it online)

### 가장 저렴한 배포 (무료) — Render + Cloudflare Pages

앱은 **프론트(HTML)** 와 **백엔드(Node API)** 가 분리되어 있어, 둘 다 무료 티어로 배포할 수 있습니다.

| 구분 | 서비스 | 비용 | 비고 |
|------|--------|------|------|
| 프론트 | [Cloudflare Pages](https://pages.cloudflare.com/) | **무료** | 정적 사이트, 빌드 없이 업로드 가능 |
| 백엔드 | [Render](https://render.com/) | **무료** | Web Service 무료 티어 (15분 미사용 시 슬립, 첫 요청 시 약 30초 대기) |

**1단계: 백엔드 배포 (Render)**

1. [render.com](https://render.com) 가입 후 **New → Web Service** 선택.
2. 이 프로젝트를 GitHub에 올린 뒤, Render에서 해당 저장소 연결.
3. 설정:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free** 선택.
4. Deploy 후 생성된 URL 복사 (예: `https://html-app-xxxx.onrender.com`).

**2단계: 프론트 배포 (Cloudflare Pages)**

1. [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages) → **Create project → Direct Upload**.
2. `html-app` 폴더를 zip으로 압축 후 업로드.
3. **배포 전에** `index.html`의 `<head>` 안(두 번째 줄 주석 아래)에 다음 한 줄 추가 후 다시 압축·업로드:

   ```html
   <script>window.APP_BACKEND_URL = 'https://html-app-xxxx.onrender.com';</script>
   ```
   (`https://...` 부분을 1단계에서 복사한 Render URL로 바꾸세요. 이걸 설정하지 않으면 매물 불러오기가 동작하지 않습니다.)

4. 배포 완료 후 나온 Pages URL(예: `https://xxx.pages.dev`)로 접속하면 됩니다.

**참고**

- Render 무료 서비스는 15분 동안 요청이 없으면 슬립합니다. 매물 불러오기 시 첫 요청만 30초 정도 걸릴 수 있습니다.
- 네이버 지도/API 키는 해당 배포 도메인(예: `xxx.pages.dev`)을 콘솔에 등록해야 합니다.

---

### 대안 1: Vercel 한 번에 배포 (프론트 + API 동일 도메인)

**한 플랫폼에서 프론트와 백엔드 API를 함께** 배포합니다. `APP_BACKEND_URL` 설정 없이 같은 도메인에서 동작합니다.

- 네이버가 Vercel 서버 IP를 막으면 **"일시적인 네트워크 오류 / NETWORK_OR_REQUEST"** 가 날 수 있습니다. 그럴 때는 아래 **"Vercel(프론트) + 외부 백엔드"** 로 전환하세요.

1. [vercel.com](https://vercel.com) 가입 후 **Add New → Project**.
2. GitHub 저장소 연결 후 **Import**.
3. **Root Directory**: 저장소 루트에 `index.html`과 `api/` 폴더가 있으면 비워 둠. **`index.html`이 하위 폴더(예: `html-app`) 안에 있으면** Root Directory에 `html-app` 입력.
4. **Build Command**: 비워 두기 (빈 칸).
5. **Output Directory**: 비워 두기.
6. **Deploy** 클릭.
7. 배포 후 나온 URL(예: `https://homefinding-xxx.vercel.app`)로 접속.

**Redeploy 방법**: (1) Git에 수정 반영 후 `git push` 하면 자동 재배포. (2) Vercel 대시보드 → 프로젝트 → **Deployments** 탭 → 최신 배포 오른쪽 **⋯** → **Redeploy**. 설정(Root Directory 등) 변경 후에는 Save 후 반드시 **Redeploy** 한 번 실행. **cannot GET /** 가 나오면: **Settings → General**에서 **Framework Preset**을 **Other**로, **Root Directory**는 `index.html`이 있는 폴더(저장소 루트면 비움)로 맞춘 뒤 Redeploy.

- API는 자동으로 `https://도메인/api/naver-listings` 로 제공됩니다.
- `index.html`에 `APP_BACKEND_URL`을 넣지 **않으면** 같은 도메인의 `/api/naver-listings`를 사용합니다.
- 네이버 지도 API 키는 Vercel 도메인(예: `*.vercel.app`)을 콘솔에 등록하세요.

---

### ★ Vercel(프론트) + 외부 백엔드 — 네트워크 오류 시 추천

**Vercel 결제를 유지한 채**, 프론트만 Vercel에 두고 **API는 Railway 또는 Render**에 따로 배포하는 방식입니다. 네이버가 Vercel IP를 막아도 외부 백엔드 IP로 요청하므로 매물 불러오기가 동작할 가능성이 높습니다.

**1단계: 백엔드 배포 (Railway 또는 Render)**

| 서비스 | 무료 한도 | 안내 |
|--------|-----------|------|
| [Railway](https://railway.app) | 월 크레딧 제한 | **New Project** → **Deploy from GitHub repo** → 이 저장소 선택 → **Settings**: Build 없음 또는 `npm install`, Start: `node server.js` → **Networking → Generate Domain** → URL 복사 (예: `https://xxx.up.railway.app`) |
| [Render](https://render.com) | 무료 티어 (15분 미사용 시 슬립) | **New → Web Service** → 저장소 연결 → **Build**: `npm install`, **Start**: `node server.js` → **Create** → URL 복사 (예: `https://html-app-xxxx.onrender.com`) |

**2단계: Vercel에 백엔드 URL 넣기**

1. Vercel 대시보드 → 해당 프로젝트 → **Settings** → **Environment Variables**.
2. **Key**: `BACKEND_URL`  
   **Value**: 1단계에서 복사한 URL (끝에 슬래시 없이, 예: `https://xxx.up.railway.app`).
3. **Save** 후 **Deployments** → 최신 배포 **⋯** → **Redeploy**.

**3단계: Vercel 빌드 시 config 주입**

1. **Settings** → **General** → **Build & Development Settings**.
2. **Build Command**에 `npm run build` 입력 (비어 있으면 추가).
3. **Save** 후 다시 **Redeploy**.

이후 배포 시마다 `npm run build`가 실행되며, `BACKEND_URL`이 `config.js`에 주입됩니다. 프론트는 Vercel에 그대로 두고, 매물 요청만 설정한 외부 백엔드로 갑니다.

---

### 대안 2: Railway (백엔드) + Cloudflare Pages (프론트)

Render 대신 **Railway**로 백엔드만 배포하는 방법입니다.

1. [railway.app](https://railway.app) 가입 → **New Project** → **Deploy from GitHub repo**.
2. 이 프로젝트 저장소 선택.
3. **Settings**에서 **Root Directory**를 프로젝트 폴더로, **Build Command**: `npm install`, **Start Command**: `node server.js`.
4. **Settings → Networking → Generate Domain**으로 URL 생성 (예: `https://xxx.up.railway.app`).
5. 프론트는 **Cloudflare Pages**로 배포하고, `index.html`의 `<head>`에 다음 추가:
   ```html
   <script>window.APP_BACKEND_URL = 'https://xxx.up.railway.app';</script>
   ```

Railway 무료 티어는 월 크레딧 제한이 있으니 사용량을 확인하세요.

---

### 대안 3: Fly.io (백엔드) + 정적 호스팅 (프론트)

**Fly.io**에 Node 백엔드를 배포할 수 있습니다.

1. [fly.io](https://fly.io) 가입 후 CLI 설치: `curl -L https://fly.io/install.sh | sh`
2. 프로젝트 폴더에서: `fly launch` (기존 app 사용 시 `fly apps create` 등 안내에 따름).
3. `Dockerfile`이 없다면 Fly가 Node 앱을 자동 감지하거나, 다음으로 생성:
   ```dockerfile
   FROM node:18-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   CMD ["node", "server.js"]
   ```
4. `fly deploy`로 배포 후 URL 확인 (예: `https://xxx.fly.dev`).
5. 프론트 배포 시 `window.APP_BACKEND_URL = 'https://xxx.fly.dev'` 설정.

---

### 1. Netlify (drag & drop)

- Go to [netlify.com](https://www.netlify.com) → **Add new site** → **Deploy manually**.
- Drag the **html-app** folder (or a zip of it) into the drop zone.
- You get a live URL (e.g. `https://random-name.netlify.app`).

### 2. Vercel

- Install Vercel CLI: `npm i -g vercel`
- From the `html-app` folder: `vercel`
- Follow the prompts; you get a URL like `https://html-app-xxx.vercel.app`.

### 3. GitHub Pages

- Create a repo, push this folder (with `index.html` at the root or in a branch).
- Repo **Settings** → **Pages** → Source: **Deploy from a branch**.
- Branch: `main` (or `master`), folder: **/ (root)**.
- Save; your site will be at `https://<username>.github.io/<repo-name>/`.

### 4. Any static host

Upload the contents of **html-app** (at least `index.html` and any assets) to:

- **AWS S3** + CloudFront  
- **Firebase Hosting**  
- **Cloudflare Pages**  
- Any host that serves static files  

Point the site (or default document) to `index.html`.

---

## Project layout

- `index.html` – Your app; replace or edit this file with your HTML.
- Add CSS/JS in the same folder or in subfolders (e.g. `css/`, `js/`) and link them from `index.html`.

Once your HTML is in `index.html`, run `npm start` to preview, then use one of the options above to deploy.
