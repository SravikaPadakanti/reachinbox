# ReachInbox - Complete Production Deployment Guide

This guide walks you through deploying the **ReachInbox Full-Stack Application** to **Render** (Backend & BullMQ Worker) and **Vercel** (Frontend SPA).

---

## 📋 Architecture Overview

* **Frontend**: React + Vite SPA deployed on **Vercel**.
* **Backend & Queue Worker**: Express API + BullMQ Worker running concurrently on **Render** (Node.js Web Service).
* **Database**: Cloud PostgreSQL on **Neon** (`https://neon.tech`) or **Supabase** (`https://supabase.com`).
* **Queue / Cache**: Cloud Redis on **Upstash** (`https://upstash.com`).
* **Email Service**: Ethereal Email (Testing) or your production SMTP provider (SendGrid, Resend, Amazon SES).

---

## Step 1: Push Code to GitHub

Open PowerShell in the project directory:

```powershell
cd "c:\Users\MEDHA TRUST\Downloads\reachinbox-full-project\final\reachinbox"

# 1. Initialize git
git init

# 2. Stage all files (node_modules and local .env are protected by .gitignore)
git add .

# 3. Create your initial commit
git commit -m "feat: complete reachinbox email scheduler with attachments, detail views, and deployment configs"

# 4. Connect to your GitHub repository
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>

# 5. Push to GitHub
git push -u origin main
```

---

## Step 2: Set Up Free Cloud Database & Redis

### A. Cloud PostgreSQL (Neon / Supabase)
1. Go to [Neon.tech](https://neon.tech) and create a free project.
2. Copy your **Connection string** (Pooled & Direct).
   - Format: `postgresql://neondb_owner:PASSWORD@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`

### B. Cloud Redis (Upstash)
1. Go to [Upstash.com](https://upstash.com) and create a free Redis database.
2. In the database details, copy the **Node.js / ioredis connection string** (`rediss://default:TOKEN@xyz.upstash.io:6379`).

---

## Step 3: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `reachinbox-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Advanced > Environment Variables**, add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables secure session cookies |
| `PORT` | `4000` | Backend port |
| `SESSION_SECRET` | *(Generate a 32+ character random string)* | Used for express-session |
| `DATABASE_URL` | `postgresql://...` | Your Neon / Supabase connection URL |
| `DIRECT_URL` | `postgresql://...` | Your direct Neon / Supabase URL |
| `REDIS_URL` | `rediss://default:...@xyz.upstash.io:6379` | Your Upstash Redis URL |
| `ETHEREAL_HOST` | `smtp.ethereal.email` | |
| `ETHEREAL_PORT` | `587` | |
| `ETHEREAL_USER` | `madyson65@ethereal.email` | Or your ethereal/SMTP user |
| `ETHEREAL_PASS` | `NFh4sbmuTcw9Y6D2eN` | Or your ethereal/SMTP password |
| `GOOGLE_CLIENT_ID` | `your_google_client_id` | Your Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `your_google_client_secret` | Your Google Cloud OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | `https://<YOUR-RENDER-URL>.onrender.com/auth/google/callback` | Update with your live Render URL |
| `FRONTEND_URL` | `https://<YOUR-VERCEL-URL>.vercel.app` | Set after creating Vercel app |
| `WORKER_CONCURRENCY` | `5` | |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | `2000` | |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | |

5. Click **Create Web Service**.
6. Once deployed, run migrations on the remote DB using the Render Shell:
   ```bash
   npx prisma migrate deploy
   ```
7. Copy your live backend URL (e.g., `https://reachinbox-backend.onrender.com`).

---

## Step 4: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Select your GitHub repository.
3. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://<YOUR-RENDER-BACKEND-URL>.onrender.com`
5. Click **Deploy**.
6. Vercel will build the frontend and provide your live production domain (e.g., `https://reachinbox.vercel.app`).

---

## Step 5: Final URL Linking & Google OAuth Configuration

1. **Update Render `FRONTEND_URL`**:
   - Go back to your Render backend service settings.
   - Update `FRONTEND_URL` to your live Vercel URL: `https://<YOUR-VERCEL-URL>.vercel.app`.
   - Click **Save Changes** (Render will reload automatically).

2. **Add Production URIs to Google Cloud Console**:
   - Visit [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Click on your OAuth 2.0 Client ID.
   - Under **Authorized redirect URIs**, ensure both exist:
     - Local: `http://localhost:4000/auth/google/callback`
     - Production: `https://<YOUR-RENDER-BACKEND-URL>.onrender.com/auth/google/callback`
   - Under **Authorized JavaScript origins**, add:
     - Local: `http://localhost:3000`
     - Production: `https://<YOUR-VERCEL-URL>.vercel.app`
   - Click **Save**.

---

## Step 6: Verify Deployment

1. Open your live Vercel URL.
2. Sign in using **Google OAuth** or **⚡ Quick Demo Login**.
3. Schedule an email campaign with an attachment.
4. Verify the email transitions to **Sent** and check the detail view.
