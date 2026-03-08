# Vercel Deployment

Deploy the Smart Attendance dashboard and APIs to Vercel. The Python face recognition engine runs separately (local PC or Render).

---

## Prerequisites

- GitHub account
- Vercel account ([vercel.com](https://vercel.com) – sign up with GitHub)
- Twilio account (for WhatsApp)

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. **Import** your GitHub repository
3. Vercel auto-detects Next.js – no extra config needed
4. Before deploying, add environment variables (Step 3)

---

## Step 3: Environment Variables

In the Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | From Twilio Console |
| `NEXT_PUBLIC_DEMO_PHONE` | `919876543210` | Recipient for tests (E.164) |
| `NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE` | `positive-express` | Your sandbox join word |

**Optional:**

| Variable | Value | Notes |
|----------|-------|-------|
| `CAMERA_STREAM_URL` | `http://localhost:5000` | Only needed if Live Feed will point somewhere |
| `KV_REST_API_URL` | From Vercel KV / Upstash | Persistent attendance logs |
| `KV_REST_API_TOKEN` | From Vercel KV / Upstash | Same as above |
| `ATTENDANCE_API_KEY` | Random string | Protects write APIs |
| `NEXT_PUBLIC_ATTENDANCE_API_KEY` | Same as above | Client-side for dashboard |

---

## Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to finish
3. Your app will be at `https://your-project.vercel.app`

---

## Step 5: After Deploy

### Test the dashboard

1. Open `https://your-project.vercel.app/admin/dashboard`
2. You should see the dashboard; Python Backend / Camera Stream will show as not connected (expected).

### Connect Python (local or Render)

On the machine running `attendance_poc.py`, set:

```bash
set ATTENDANCE_API_URL=https://your-project.vercel.app
```

(PowerShell) or:

```bash
export ATTENDANCE_API_URL=https://your-project.vercel.app
```

(Linux/macOS). When a face is recognized, Python will POST to your Vercel API and WhatsApp will be sent.

---

## Build Settings (default)

- **Framework:** Next.js (auto-detected)
- **Build Command:** `npm run build` or `next build`
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install`

No `vercel.json` is required for standard Next.js.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Node version (20+); run `npm run build` locally first |
| WhatsApp test fails | Verify Twilio creds; recipient must send `join <word>` to +1 415 523 8886 |
