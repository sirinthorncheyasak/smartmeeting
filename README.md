# BU Document Tracking System (Inbound / Outbound) — Production Grade

A full-stack enterprise-grade web application for managing document intake (รับเข้า) and document dispatch (ส่งออก) within Bangkok University. Built of highly secure Attribute-Based Access Control (ABAC), concurrency-safe Firestore transactions, and high-fidelity real-time streams.

---

## 🧠 System Architecture

- **Intake Flow (Inbound)**: Immediate cataloging and date filing (Classification: `inbound`, direction: `in`). Starts automatically in finalized archiving.
- **Dispatch Flow (Outbound)**: Sequence starting as `pending` under administrative revision. A strict, serial running key is generated inside a concurrency-safe Firestore Transaction.
- **Workflow timeline tracking**: Approvals and rejections are logged immutably with dynamic action metadata and author indicators.
- **Secure list queries**: Users only query documents they own, whereas administrators (`kulachet.l@bu.ac.th`) query all submissions cleanly to avoid any authorization limits.

---

## 📤 Outbound Document Number Format

### Formula:
`ทน.YYMMXXX`

- `ทน.`: Fixed Thai prefix.
- `YY`: Last 2 digits of the active Buddhist Year (พ.ศ.) (calculated as Western Year + 543).
- `MM`: Pad-0 double-digit calendar month (e.g., `06` for June).
- `XXX`: 3-digit padded running index (`001` to `999`), resetting atomically first day of every month.

---

## 🔐 Credentials & Environment Setup

Configure these environment keys inside your Netlify, GitHub Actions, or local environment parameters:

```env
# Firebase Connection Parameters
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=default
```

---

## 🚀 Deployment Instructions

### 📦 Deploying to Netlify
1. Log in to the **Netlify Console**.
2. Select **Add new site** -> **Import from existing project (GitHub)**.
3. Configure these Parameters:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add the Firebase variables listed above in the **Environment variables** section of Netlify.
5. Tap **Deploy Site**. The custom redirect rule inside `netlify.toml` automatically manages clean SPA browser routes.

### 🔥 Deploying to Firebase Hosting
1. Install firebase-tools: `npm install -g firebase-tools`
2. Log in using authorized terminal credentials: `firebase login`
3. Associate local configurations: `firebase deploy --only hosting`

### 💻 GitHub Actions (CI/CD)
The workflow file is fully pre-configured under `.github/workflows/deploy.yml`. Provide `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` inside GitHub repository secrets to trigger continuous staging and deployment on push events!
