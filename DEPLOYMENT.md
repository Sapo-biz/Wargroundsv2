# Orbitron Deployment Guide

## Prerequisites

1. ✅ Google OAuth Client ID configured (origins + redirect URIs set)
2. ✅ Stripe account with live keys ready
3. ✅ HTTPS/SSL certificate on your domain
4. ✅ Node.js 16+ installed (for backend)

---

## Step 1: Configure Environment Variables

Create a `.env` file in your project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Then fill in your actual values:

- `STRIPE_SECRET_KEY` — from Stripe Dashboard (API Keys section)
- `STRIPE_PUBLISHABLE_KEY` — from Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` — from Stripe Webhooks after setting up endpoint
- `STRIPE_PRICE_ID` — from Stripe Products → Your subscription price
- `FRONTEND_URL` — `https://www.wargrounds.online`

---

## Step 2: Install Dependencies

```bash
npm install express stripe cors dotenv
```

---

## Step 3: Stripe Webhook Setup

1. Go to **Stripe Dashboard** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://www.wargrounds.online/api/webhook` (or your backend URL)
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** → paste into `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Step 4: Deploy Frontend (Static Files)

Your HTML/CSS/JS files go to your web server or CDN:

```bash
# Example: Copy to web root
cp index.html style.css /var/www/wargrounds.online/
cp -r js/ /var/www/wargrounds.online/
```

The frontend loads from: `https://www.wargrounds.online/`

---

## Step 5: Deploy Backend

### Option A: Heroku (Easiest)

```bash
# Install Heroku CLI, then:
heroku login
heroku create orbitron-backend
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_...
# ... set all other env vars ...
git push heroku main
```

Then update frontend code:

- Change API calls from `localhost:3000` → `https://orbitron-backend.herokuapp.com`

### Option B: Traditional VPS (DigitalOcean, Linode, AWS EC2)

```bash
# SSH into your server
ssh user@your-vps-ip

# Clone your repo
git clone https://github.com/yourname/orbitron.git
cd orbitron

# Create .env file
nano .env
# Paste your environment variables

# Install dependencies
npm install

# Run with PM2 (keeps running after SSH disconnect)
npm install -g pm2
pm2 start backend.js --name "orbitron"
pm2 startup
pm2 save
```

Then set up Nginx as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name api.wargrounds.online;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option C: Vercel (For Node backend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Then set environment variables in Vercel dashboard → Settings → Environment Variables

---

## Step 6: Update Frontend Config

In your frontend code, if backend is on a different domain:

```javascript
// In main.js, GoogleAuth.syncToServer():
const backendUrl = 'https://api.wargrounds.online'; // or same domain
await fetch(`${backendUrl}/api/cloud-save`, ...);
```

---

## Step 7: Test Everything

### Test Google Login

- Go to `https://www.wargrounds.online`
- Click "Sign in with Google"
- Should see login popup with your OAuth config

### Test Stripe Payment

- Open premium overlay
- Click "SUBSCRIBE NOW"
- Use test card: `4242 4242 4242 4242`
- Expiry: any future date
- CVC: any 3 digits
- Should redirect to success page

### Test Cloud Save

- Sign in with Google
- Play a run, die
- Sign out → local save should load
- Sign back in → cloud save should load

### Test Mobile Controls

- Open on mobile/tablet
- Should see joystick on left, 5 action buttons on right
- Test each control

---

## Common Issues

**"Google Sign-In not working"**

- Verify HTTPS is active (Google requires it)
- Check origins are added in Google Cloud Console
- Check Client ID in `main.js` is correct

**"Stripe checkout never loads"**

- Verify `STRIPE_PUBLISHABLE_KEY` in code
- Check backend is reachable at `/api/create-checkout-session`
- Check CORS headers are set

**"Cloud save not syncing"**

- Verify backend `/api/cloud-save` endpoint is accessible
- Check browser console for fetch errors
- Falls back to localStorage automatically if backend unavailable

---

## Next Steps

1. Choose hosting option (Heroku easiest for getting started)
2. Set up SSL certificate (if not already done)
3. Deploy backend
4. Deploy frontend
5. Test all flows
6. Monitor Stripe dashboard for payments
7. Set up monitoring/alerts

Questions? Check the console for errors and share them!
