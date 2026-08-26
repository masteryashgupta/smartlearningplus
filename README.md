# Smart Learning+ (Monorepo)

Unified monorepo for the **Smart Learning+** open engineering study platform.

---

## 📁 Repository Structure

```
smartlearningplus/
├── frontend/                  # React + Vite frontend (deployed on GitHub Pages)
│   ├── public/                # HTML unit courseware modules and static assets
│   ├── src/                   # React components, pages, and client API
│   ├── package.json           # Frontend dependencies and build scripts
│   └── vite.config.js         # Vite configuration
├── backend/                   # Node.js + Express backend (deployed on Render)
│   ├── src/                   # Express routes, controllers, DB connection, RAG AI
│   ├── sql/                   # Database schema migrations
│   └── package.json           # Backend dependencies and server scripts
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions workflow for frontend Pages deployment
└── README.md
```

---

## 🚀 Deployment & Configuration

### Frontend (GitHub Pages)
- **Deployment:** Automated via `.github/workflows/deploy.yml` on push to `main` when `frontend/**` files change.
- **Working Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `frontend/dist`
- **Custom Domain:** `smartlearningplus.me` (configured via `frontend/CNAME`)

### Backend (Render)
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start` (or `node src/server.js`)
- **Node Environment:** Node.js 20+

---

## 💻 Local Development

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```
