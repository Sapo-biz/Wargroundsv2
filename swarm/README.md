# WARGROUNDS — Swarm (Bees)

**URL:** **wargrounds.online/swarm** (or arena.wargrounds.online)

Top-down arena where your **bees** do the work. Unlock **petals** (florr.io-style) and grow your swarm.

---

## Core loop

- You control a **player body**; **bees** orbit you and deal damage on contact.
- Each bee has **individual health** and **damage** (3× your bullet damage, modified by petal).
- Enemies and bosses damage your bees; bees respawn after **8 seconds** with the same petal.
- At levels **20, 40, 60, 80…** you choose: **+2 Bees** or unlock a **new petal**.

---

## Bee stats (base)

| Stat | Value |
|------|--------|
| **Starting bees** | 5 |
| **Orbit radius** | 88 |
| **Bee radius** | 7 |
| **Damage** | 3 × player bullet damage (× petal modifier) |
| **Base health** | 45 (× petal modifier) |
| **Respawn time** | 8 s after death |

---

## Petals

Petals change how each bee behaves. Unlock them at tier upgrades (level 20, 40, 60, 80). New bees from **+2 Bees** use a random **unlocked** petal.

| Petal | Unlock | Damage | Health | Speed | Description |
|-------|--------|--------|--------|--------|-------------|
| **Basic** | Start | 1× | 1× | 1× | Default bee. Balanced. |
| **Rose** | 20 | 1.4× | 0.85× | 1× | High damage, slightly fragile. |
| **Cactus** | 20 | 1.15× | 1.5× | 0.95× | Tanky bee, good sustain. |
| **Sunflower** | 40 | 0.9× | 1.35× | 1.1× | Fast orbit, extra health. |
| **Tulip** | 40 | 1.2× | 1.1× | 1× | Well-rounded upgrade. |
| **Lily** | 60 | 1.35× | 1× | 1.05× | Pure damage focus. |
| **Clover** | 60 | 1× | 1.45× | 1× | Very tanky, standard damage. |
| **Ivy** | 80 | 1.25× | 1.25× | 0.9× | Balanced power and bulk. |
| **Orchid** | 80 | 1.5× | 0.75× | 1.15× | Glass cannon bee. |

- **Damage**: multiplier on the bee’s 3× bullet damage.
- **Health**: multiplier on base bee health (45).
- **Speed**: multiplier on orbit speed (faster = more hits per lap).

---

## Upgrade choices (every 20 levels)

- **+2 Bees** — Add two bees to your swarm. Their petal is chosen at random from your unlocked petals.
- **New petal** — Unlock a petal for that tier (e.g. Rose or Cactus at 20). Future **+2 Bees** can spawn bees of that type.

---

## Player stats (1–7)

| Key | Stat | Effect |
|-----|------|--------|
| 1 | SPD | Movement speed |
| 2 | DMG | Bullet damage (also scales bee damage) |
| 3 | HP | Max health |
| 4 | REG | Regen |
| 5 | PET | Pet (orbiting shooter) |
| 6 | RLD | Fire rate |
| 7 | RGE | (Reserved; bees use petals instead) |

---

## Zones & enemies

- **SAFE → HAZARD → ELITE → ABYSS**: deeper zones have tougher, rarer mobs.
- Fewer, stronger enemies; bees are your main damage source.

---

## Graphics

- Each bee is drawn in its **petal color** (fill + stroke).
- A small **health bar** appears above a bee when it’s damaged.
- Petals are distinguished by color (e.g. Basic = gold, Rose = pink/red, Cactus = green).

---

*Have fun building your swarm.*
