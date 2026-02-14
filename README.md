# Wargrounds subdomains

Deploy each subfolder to its matching subdomain or path under **wargrounds.online**.

## Swarm (bees & petals)

- **Path in repo:** `arena/`
- **Preferred URL:** **wargrounds.online/swarm**
- **Alternate:** `arena.wargrounds.online` (subdomain)

Use the contents of `arena/` as the app (bees game with petals).

### Option A: Path on main domain (wargrounds.online/swarm)

- **Vercel:** In the project for `wargrounds.online`, add the `arena` app so it’s served at `/swarm` (e.g. put `arena/` contents in a `swarm` directory, or set rewrites so `/swarm` and `/swarm/*` serve the arena app).
- **Netlify:** Deploy the main site; in `public/` (or your doc root) add a `swarm` folder and put the contents of `arena/` inside it. Then **https://wargrounds.online/swarm/** serves the game.
- **Static server:** Copy `arena/` to your site root as `swarm/`. So `https://wargrounds.online/swarm/` and `https://wargrounds.online/swarm/index.html` serve the game.

### Option B: Subdomain (arena.wargrounds.online)

- **Vercel:** Add a project, set root to `subdomains/arena`, add domain `arena.wargrounds.online`.
- **Netlify:** New site from `subdomains/arena`, add custom domain `arena.wargrounds.online`.
- **Cloudflare Pages:** Project from `subdomains/arena`, custom domain `arena.wargrounds.online`.
- **DNS:** CNAME `arena` → your host’s target.

Then open **https://wargrounds.online/swarm** (or **https://arena.wargrounds.online**) to play.
