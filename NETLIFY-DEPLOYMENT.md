# Netlify Deployment Guide for Orbitron

This guide covers deploying Orbitron to Netlify with Netlify Functions for the backend.

## Prerequisites

1. **Netlify Account** — Sign up at https://netlify.com (free tier available)
2. **Stripe Account** — Set up at https://stripe.com
3. **Git Repository** — Your code should be in a Git repo (GitHub, GitLab, or Bitbucket)
4. **Node.js 16+** — For local development

## Step 1: Verify Project Structure

Your project should have:

```
orbitron/
├── index.html
├── style.css
├── js/
│   ├── main.js
│   ├── engine.js
│   ├── entities.js
│   ├── particles.js
│   ├── systems.js
│   ├── ui.js
│   └── config.js
├── netlify.toml           ← (Already created)
├── netlify/
│   └── functions/         ← Serverless functions
│       ├── create-checkout-session.js
│       ├── verify-session.js
│       ├── cloud-save.js
│       ├── cloud-load.js
│       └── webhook.js
├── .env.example
├── package.json
├── .gitignore
└── README.md
```

## Step 2: Set Up Environment Variables

### 2a. Get Stripe Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_live_`)
3. Copy your **Publishable Key** (starts with `pk_live_`)

### 2b. Create a $7.99/Month Subscription

1. Go to https://dashboard.stripe.com/products
2. Click **Create** → **Product**
   - Name: `Orbitron Premium`
   - Type: Recurring
3. Add pricing:
   - Price: $7.99
   - Recurring: Monthly
4. Copy the **Price ID** (starts with `price_`)

### 2c. Create `.netlify/functions/.env`

In your project root, create this file:

```env
STRIPE_SECRET_KEY=sk_live_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_publishable_key_here
STRIPE_PRICE_ID=price_your_actual_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_leave_blank_for_now
NODE_ENV=production
FRONTEND_URL=https://your-netlify-domain.netlify.app
```

> **Note**: You'll get the webhook secret after deploying. Update it later.

## Step 3: Test Locally (Optional)

```bash
# Install dependencies
npm install

# Install Netlify CLI
npm install -g netlify-cli

# Run local dev environment
netlify dev
```

Visit http://localhost:8888 to test. API requests will automatically route to local functions.

## Step 4: Deploy to Git

Push your code to GitHub/GitLab/Bitbucket:

```bash
git add .
git commit -m "Add Netlify Functions for Orbitron"
git push origin main
```

## Step 5: Connect to Netlify

### Option A: Via Netlify UI (Easiest)

1. Go to https://app.netlify.com
2. Click **New site from Git**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Select your `orbitron` repository
5. Build settings should auto-fill:
   - **Build command**: `npm install`
   - **Publish directory**: `.` (root)
   - **Functions directory**: `netlify/functions`
6. Click **Deploy site**

### Option B: Via Netlify CLI

```bash
# From project root
netlify link                    # Link to your Netlify site
netlify deploy --prod           # Deploy to production
```

## Step 6: Add Environment Variables to Netlify

1. Go to your Netlify site dashboard
2. **Site settings** → **Build & deploy** → **Environment**
3. Click **Edit variables** and add:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `STRIPE_PRICE_ID` = `price_...`
   - `STRIPE_WEBHOOK_SECRET` = (leave blank for now)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://your-site.netlify.app`

4. **Redeploy** from **Deploys** tab to apply env vars

## Step 7: Set Up Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. Webhook URL: `https://your-site.netlify.app/api/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Back in Netlify:
   - Update `STRIPE_WEBHOOK_SECRET` env var
   - **Redeploy** site

## Step 8: Connect Custom Domain (www.wargrounds.online)

1. Go to your Netlify site dashboard → **Domain settings**
2. Add custom domain: `wargrounds.online`
3. Netlify will show DNS instructions. Go to your domain registrar and:
   - Update the A record to Netlify's IP
   - Add any ALIAS/CNAME records Netlify specifies
4. Wait 5-15 minutes for DNS propagation
5. Netlify auto-provisions HTTPS certificate

## Step 9: Test the Live Site

Visit `https://www.wargrounds.online`:

1. **Google Sign-In**: Should work (button visible)
2. **Premium Purchase**: Click button → Stripe checkout → Use test card `4242 4242 4242 4242` → Expiry `12/34` → CVC `123`
3. **Cloud Save**: Sign in → Play → Die → Sign in again → Progress should be restored
4. **Mobile Controls**: On mobile, joystick + buttons should appear

## Troubleshooting

### "API calls failing"

- Check that env vars are set in Netlify dashboard
- Verify `netlify.toml` has the correct redirects
- Check browser console for CORS errors

### "Google login popup blank"

- Ensure `www.wargrounds.online` is in your Google Cloud OAuth origins
- Go to https://console.cloud.google.com → OAuth 2.0 Client IDs → Edit

### "Stripe webhook not firing"

- Verify webhook endpoint URL is `https://www.wargrounds.online/api/webhook`
- Check webhook signing secret in env vars
- Test webhook from Stripe dashboard (click **Send test webhook**)

### "Can't deploy changes"

- Make sure you pushed to Git (Netlify auto-deploys on push)
- Check **Deploys** tab for build errors
- Review logs: Click deploy → **Deploy log**

## Next Steps

1. Test premium on production
2. Monitor Stripe dashboard for real subscriptions
3. Set up error tracking (Sentry, LogRocket)
4. Create petal shop cosmetics shop with catalog
5. Add leaderboards / multiplayer features

## File Reference

- **netlify.toml** — Build config, functions directory, environment variables
- **netlify/functions/\*.js** — Serverless backend endpoints
- **package.json** — Dependencies (express, stripe, cors)
- **.env.example** — Template for env vars

## Support

- Netlify Docs: https://docs.netlify.com/functions/overview
- Stripe Docs: https://stripe.com/docs/stripe-js
- Google Sign-In: https://developers.google.com/identity/gsi
