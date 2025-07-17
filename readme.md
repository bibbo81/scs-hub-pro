# # SCS Hub Pro 🚀

> **Transform your supply chain chaos into clarity.** Real-time tracking, intelligent insights, and seamless logistics management - all in one powerful platform.

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Platform](https://img.shields.io/badge/platform-web-blue)]()
[![ES6](https://img.shields.io/badge/ES6-modules-yellow)]()

## 🎯 Why SCS Hub Pro?

In today's global supply chain, **visibility is everything**. Lost shipments, delayed containers, and fragmented tracking systems cost businesses millions. SCS Hub Pro solves this by unifying all your logistics data into a single, beautiful interface.

### 🌟 Key Benefits

- **Save 3+ hours daily** on manual tracking checks
- **Reduce delays by 40%** with proactive notifications  
- **Cut operational costs** with intelligent route optimization
- **Scale effortlessly** from 10 to 10,000 shipments

---

## ✨ Features

### 📦 Universal Tracking
- Multi-carrier support (MSC, Maersk, CMA-CGM, DHL, FedEx, and more)
- Container, B/L, AWB, and parcel tracking
- Real-time status updates with timeline visualization

### 🚢 ShipsGo Integration
- Direct API connection for maritime tracking
- Automatic vessel schedules and port updates
- CO₂ emissions tracking for sustainability reporting

### 📊 Smart Dashboard
- KPI metrics at a glance
- Predictive analytics for delays
- Custom alerts and notifications
- Export reports in PDF/Excel

### 🔄 Bulk Operations
- Import hundreds of trackings via CSV/Excel
- Batch status updates
- Automated data synchronization
- Smart duplicate detection

### 📄 Tracking object format

Trackings share a common structure across the project. See `core/typedefs.d.ts` for the base
`TrackingLike` definition used throughout the codebase.

```js
/** @type {TrackingLike} */
const example = {
    tracking_number: 'MSKU1234567',
    tracking_type: 'container',
    origin_port: 'SHANGHAI',
    destination_port: 'ROTTERDAM',
    origin_country: 'CN',
    eta: '2025-07-20'
};
```

---

## 🚀 Quick Start

Get up and running in less than 2 minutes:

```bash
# Clone repository
git clone https://github.com/[username]/scs-hub-pro.git
cd scs-hub-pro

# Start development server
python3 -m http.server 8000 --directory public

# Open in browser
open http://localhost:8000/tracking.html
```

⚙️ Branch Workflow — feature/complete-update

🚦 IMPORTANT: All development happens directly on the feature/complete-update branch to avoid unnecessary patch branches and PR merges.
✅ How to work
1️⃣ Always work on the branch:

git checkout feature/complete-update
git pull origin feature/complete-update
2️⃣ Make your changes with Copilot/Codex or manually.

3️⃣ Stage & commit:

git add .
git commit -m "feat: your description"
4️⃣ Push directly:

git push
If needed, set upstream once:

git push --set-upstream origin feature/complete-update
🔒 Branch protection
feature/complete-update is unprotected → direct commits allowed.
main stays protected → merge only when stable.
✅ Web UI commits
When committing via GitHub web editor, always select:

⭕ Commit directly to the feature/complete-update branch
Never select:

⭕ Create a new branch for this commit and start a pull request
🚀 Deploy
Production deploy is triggered when main is updated.

Merge feature/complete-update to main when ready:

git checkout main
git pull origin main
git merge feature/complete-update
git push origin main
⚡ Optional shortcut
Add this alias:

git config --global alias.pushfcu 'push origin feature/complete-update'
Then:

git pushfcu
📌 Follow this flow → No patch branches → No redundant PRs → Smooth deploy 🚀

## 🔧 Environment setup

Ensure the Netlify project defines the following variables **in the Netlify dashboard**:

- `SUPABASE_URL` – your Supabase instance URL (e.g. `https://gnlrmnsdmpjzitsysowq.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` – **must be set**; service role key for server-side functions
- `SUPABASE_ANON_KEY` – public anonymous key

Set them in **Site settings → Environment variables**. Functions like `netlify/functions/notifications.js` rely on these values and will fail with `500` errors if missing.

Real‑time features use WebSocket connections to the Supabase URL. Make sure outbound WebSocket traffic is allowed; otherwise the application will fall back to HTTP-only APIs.

Develop locally with **Node.js v18** to match `.nvmrc` (run `nvm use` if available).

## 🛡 Security notes

The application uses the `xlsx` library (0.18.5) to parse Excel files in
`netlify/functions/parse-excel.js` and on the import page. `npm audit` flags this
version for **prototype pollution** and **ReDoS** vulnerabilities. No patched
release is available on npm and popular alternatives such as `exceljs` still
bundle the same library. Uploads are limited to internal, trusted users and the
data is parsed entirely in memory without executing embedded formulas. We accept
this risk while monitoring upstream releases.
