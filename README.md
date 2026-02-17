# Orbitron — Orbital Survival Game

A fast-paced HTML5 Canvas orbital survival game with:

- **Mobile touch controls** (joystick + round action buttons)
- **Stripe premium subscription** ($7.99/month)
- **Google Sign-In** for cloud save sync
- **Permanent progression** (stash petals, upgrades, skins)
- **Strategic gameplay** (merge petals, upgrade stats, survive waves)

---

## Quick Start (Local Testing)

### Frontend Only (No Backend)

```bash
# Open in browser
open index.html

# OR serve locally
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Full Setup (With Backend)

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create `.env` file** (copy from `.env.example`):

   ```bash
   cp .env.example .env
   # Edit .env with your Stripe + Google keys
   ```

3. **Start backend:**

   ```bash
   npm start
   # Runs on http://localhost:3000
   ```

4. **Open frontend** in browser:
   ```
   http://localhost:3000
   ```

---

## Project Structure

```
/
├── index.html           # Main HTML shell
├── style.css            # Glassmorphism styling
├── js/
│   ├── config.js        # Game constants (petals, enemies, rarities)
│   ├── engine.js        # Canvas, input, audio, mobile touch controls
│   ├── main.js          # Game loop, state machine, Stripe + Google Auth
│   ├── entities.js      # Player, enemies, petals, projectiles
│   ├── particles.js     # Particle effects
│   ├── systems.js       # Wave system, upgrades, save system
│   └── ui.js            # All menus, HUD, tutorial
├── backend.js           # Express server (Stripe, webhooks, cloud saves)
├── package.json         # Node dependencies
├── .env.example         # Environment variable template
├── DEPLOYMENT.md        # Deployment guide
└── README.md            # This file
```

---

## Features

### Gameplay

- **Orbital Petals** — Auto-orbiting weapons you can extend/retract
- **Wave-Based Enemies** — Difficulty scales, bosses every 5 waves
- **Leveling System** — Choose new petals as you level up
- **Merging Mechanic** — Combine 3 identical petals for higher rarity
- **Permanent Stash** — Save petals between runs
- **Pet Companion** — Summonable ally that fights with you

### Monetization

- **$7.99/month Premium** — All skins unlocked + daily stardust bonus
- **Petal Shop** — Buy divine/cosmic/eternal petals directly ($2.99–$9.99)
- **Stripe Integration** — Secure subscription checkout
- **Upsell on Death** — Rotating funny messages with petal offers

### Account System

- **Google Sign-In** — One-click authentication
- **Cloud Save Sync** — Progress persists across devices
- **LocalStorage Fallback** — Works offline too

### Mobile

- **Touch Joystick** — Drag-based movement control (left side)
- **Round Action Buttons** — Extend, Retract, Dash, Equip, Store (right side)
- **Mobile-Adapted UI** — Tutorial + hints adjust for touch
- **Responsive Design** — Works on 312px–2560px screens

---

## Controls

### Desktop

- **WASD / Arrow Keys** — Move
- **SPACE** — Extend petals
- **SHIFT** — Retract petals
- **Q** — Dash
- **E** — Equip nearby loot
- **O** — Store in inventory
- **1–9** — Move petal to inventory

### Mobile

- **Left Joystick** — Move (drag in any direction)
- **⊕ Button** — Extend petals
- **⊖ Button** — Retract petals
- **⚡ Button** — Dash
- **E Button** — Equip loot
- **O Button** — Store in inventory

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on:

- Heroku deployment
- Traditional VPS setup
- Vercel deployment
- Stripe webhook configuration
- Google OAuth setup

---

## Configuration

### Environment Variables (.env)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
FRONTEND_URL=https://www.wargrounds.online
```

### Game Constants (config.js)

- Petal rarities, orbital types, enemy stats
- Permanent upgrade costs
- Petal shop prices
- Death upsell messages

---

## Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Chrome/Safari

Requires:

- HTML5 Canvas
- Audio Context API
- LocalStorage
- Touch Events (mobile)

---

## License

MIT — Feel free to fork and modify!

---

## Support

**Issues?**

- Check browser console (F12) for errors
- Verify HTTPS is active (required for Google Sign-In & Stripe)
- Ensure backend is running and reachable
- Check `.env` variables are correct
- Review logs in backend terminal

**Questions?** See code comments and inline documentation throughout.

Happy surviving! 🌌
