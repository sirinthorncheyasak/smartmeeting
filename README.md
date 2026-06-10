# BU Meeting Room Reservation System

A production-ready, highly polished Bangkok University (BU) Meeting Room Reservation System built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Firebase (Firestore & Authentication)**. It features real-time synchronization, advanced reservation scheduling, an administrative analytics dashboard, a faculty directory management tool, and integration endpoints with Google Workspace (Apps Script).

## 🚀 Key Features

- **Bangkok University OAuth**: Secure Google Sign-In strictly enforced for domains ending in `@bu.ac.th` and pre-authorized administrative UIDs.
- **Real-Time Booking Scheduling**: Bidirectional real-time database watchers for rooms, booking slots, and active statuses using Firestore snapshot listeners.
- **Modern KPI & Analytics Dashboard**: Fully functional interactive Recharts charts (Area Trends, Pie Distribution, Bar Usage analysis) sliced dynamically by Academic Cycle constraints (Aug - Jul) and specific calendar months.
- **Faculty Directory Upload**: Bulk CSV drag-and-drop parse utility or manual directory editor for white-listing and managing qualified staff.
- **Google Workspace integration**: Configurable Apps Script endpoints (`/send-booking-email`, `/create-calendar-event`) to automate invitations and outbound emails.
- **Zero-Trust Security Rules**: Hardened ABAC (Attribute-Based Access Control) Firestore security rules to protect records and PII data from direct client scraping.

---

## 🛠️ Stack Overview

- **Frontend Framework**: React 19 + TypeScript
- **Bundler & Dev Server**: Vite 6
- **Styling**: Tailwind CSS 4 with ultra-custom "Glassmorphism" panels
- **Animations**: Motion (formerly Framer Motion)
- **Database & Authentication**: Firebase Firestore + Firebase Auth
- **Graphs & Charts**: Recharts + Lucide Icons

---

## 🔧 Installation & Local Setup

### 1. Clone the repository and install dependencies
```bash
git clone <your-repository-url>
cd bu-meeting-room-reservation
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

### 3. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

---

## 🏗️ Production Build and Verification

Compile TypeScript and build optimized static assets for release:
```bash
npm run build
```
Verify types and structure cleanly:
```bash
npm run lint
```

---

## ☁️ Continuous Deployment via Netlify

The project includes a production-ready `netlify.toml` which configures Netlify to handle single-page application (SPA) routing and client asset resolution.

### 📋 Netlify Environment Variables Configuration
Declare the following environment variables in your **Netlify Project Console** under **Site configuration > Environment variables**:

| Variable Key | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your Firebase project Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain (e.g., `proj.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your Storage bucket (e.g., `proj.firebasestorage.app`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID for Firebase Messages |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | (Optional) Named Firestore database ID (defaults to empty/`(default)`) |

---

## 🔥 Firebase Firestore & Configuration

The repository contains declarative files to bundle deployment artifacts:
- `firebase.json`: Declares routing maps for rules and schemas.
- `firestore.rules`: Enterprise-level Zero-Trust security rules validating data types, matching specific email patterns, and locking completed reservation states.
- `firestore.indexes.json`: Schema definitions for custom query indexing.

Deploy rules via the Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

---

## 👥 Authors & License
Designed for authorized academic structures inside Bangkok University.
All rights reserved © 2026.
