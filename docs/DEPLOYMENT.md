# Cloud Deployment & Free-Tier Infrastructure Guide

## 1. Cloud Architecture Overview

The system is designed to run 100% on **perpetual free-tier infrastructure** without requiring paid APIs or credit card mandates.

```mermaid
graph LR
    User([Browser Client])
    User -->|HTTPS| CDN[Vercel / Cloudflare Pages]
    CDN -->|SPA Bundle| User
    User <-->|WSS & REST| Backend[Render.com / Railway]
    Backend <-->|TLS Pooling| DB[(Neon Serverless PostgreSQL)]
```

| Component | Platform | Free Tier Specifications | Cost |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | **Cloudflare Pages** or **Vercel** | Unlimited static bandwidth, global edge CDN, automated Git deploys. | **$0 / month** |
| **Backend WebSocket Server** | **Render.com** or **Railway** | 512 MB RAM, free web services with full native WebSocket support. | **$0 / month** |
| **PostgreSQL Database** | **Neon** or **Supabase** | 0.5 GB storage, serverless autoscaling, instant branching, connection pooling. | **$0 / month** |

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Provision Free PostgreSQL Database (Neon)
1. Navigate to [https://neon.tech](https://neon.tech) and sign up with GitHub (no credit card required).
2. Create a new project named `flam-canvas`.
3. Copy the provided connection string:
   ```
   postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Deploy Backend Server to Render
1. Push your repository to GitHub.
2. Sign in to [https://render.com](https://render.com) and click **New + $\rightarrow$ Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Root Directory**: `apps/server` (or monorepo root)
   - **Build Command**: `npm install && npm run prisma:generate --workspace=@flam/server && npm run build --workspace=@flam/server`
   - **Start Command**: `node apps/server/dist/index.js`
   - **Environment Variables**:
     - `PORT`: `4000`
     - `HOST`: `0.0.0.0`
     - `NODE_ENV`: `production`
     - `DATABASE_URL`: *Paste Neon PostgreSQL URL from Step 1*
     - `CORS_ORIGIN`: `*` (or your frontend domain)
5. Click **Deploy Web Service**. Render will provision your URL:
   `https://flam-server.onrender.com` (WebSocket: `wss://flam-server.onrender.com/ws`).

### Step 3: Run Database Migrations
In your local terminal or Render shell:
```powershell
npx prisma db push --schema=apps/server/prisma/schema.prisma
```

### Step 4: Deploy Frontend Client to Vercel / Cloudflare Pages
1. Sign in to [https://vercel.com](https://vercel.com).
2. Import the GitHub repository.
3. Configure project settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_SERVER_HTTP_URL`: `https://flam-server.onrender.com`
     - `VITE_SERVER_WS_URL`: `wss://flam-server.onrender.com/ws`
4. Click **Deploy**. Vercel will output your live URL:
   `https://flam-collaborative-canvas.vercel.app`.

---

## 3. Production Verification Checklist

- [x] Open live frontend URL in two separate incognito windows side-by-side.
- [x] Confirm the green "Connected" status pill appears on both clients.
- [x] Move mouse in Window 1 and verify real-time cursor tracking appears smoothly in Window 2.
- [x] Draw shapes in Window 1 and confirm they render immediately in Window 2.
- [x] Reload Window 2 and verify shapes persist from the database.
