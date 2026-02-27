# WING⚡BOSS FINAL BOT (Termux-first)

## Quick Start (Termux) — Copy/Paste

### 1) Unzip (works even if the zip is in Downloads)
```bash
cd ~

# If you saved the zip from Telegram/Browser, it's usually here:
ls -lh ~/storage/downloads/WINGBOSS_FINAL_BOT*.zip 2>/dev/null || true

# Pick the exact zip filename you have:
ZIP=~/storage/downloads/WINGBOSS_FINAL_BOT_v1.0.3_MENU70_LOCKED.zip

# Unzip into ~/WINGBOSS_FINAL_BOT (overwrites files safely)
rm -rf ~/WINGBOSS_FINAL_BOT
unzip -o "$ZIP" -d ~
cd ~/WINGBOSS_FINAL_BOT
```

### 2) Install deps
```bash
npm install
```

### 3) Create your .env (do NOT commit it)
```bash
cp .env.example .env
nano .env
```

Minimum required in `.env`:
- `BOT_TOKEN=...` (from BotFather)
- `OWNER_TELEGRAM_ID=...` (your numeric Telegram ID)
- `STAFF_CHAT_ID=...` (staff supergroup ID, starts with `-100...`)

### 4) Run
```bash
bash scripts/termux_run.sh
```


## 1) Run (Termux)

```bash
cd ~/WINGBOSS_FINAL_BOT
npm install
cp .env.example .env
nano .env
bash scripts/termux_run.sh
```

`.env` must include at least:

- `BOT_TOKEN=...`
- `BOT_USERNAME=callwingboss` (no `@`)
- `OWNER_TELEGRAM_ID=5500590901`
- `STAFF_CHAT_ID=-1003653716341`

Stop: `CTRL+C`

---

## 2) Update from GitHub + run

```bash
cd ~/WINGBOSS_FINAL_BOT
bash scripts/update.sh
```

---

## 3) Build a shareable zip (downloads folder)

```bash
cd ~/WINGBOSS_FINAL_BOT
bash scripts/release.sh
```

This creates `WINGBOSS_FINAL_BOT_v<version>_<timestamp>.zip` and copies it to `~/storage/downloads/` (if available).

---

## 4) Modes (LOCKED toggles)

- `RUNTIME_MODE=termux|server`
- `BACKEND_MODE=off|db`
- `FAILOVER_MODE=local|hard_fail`

Rules:
- Termux mode **never** loads Prisma.
- DB code is dynamic-imported in **one place only**: `src/repos/index.ts`

---

## 5) What works today

### Staff Ops (staff group)
- One staff card per order with buttons:
  `Accept → Cooking → Ready Checklist → Ready → Book Driver → Picked → Delivered → Issue`
- Status line updates by message edit; keyboard stays attached.
- SOP sequence enforced; invalid sequence shows alert.
- Dispatch Pack posts copy/paste payload to staff group.
- Dispatch Pack includes:
  - Google Maps pin + “nearby” links when `order.delivery.location` exists
  - optional OSM reverse-geocode hint (cached), controlled by `GEOCODE_MODE=osm|off`

### Customer Checkout (DM-only)
- Location share uses Telegram “request location” reply keyboard.
- Guard: if tapped in a group, bot replies “DM only” (no Telegram error).

### Staff Academy (DM-only, gated)
- `/academy` is gated:
  - owner always allowed
  - allowlist via `STAFF_ALLOWLIST_IDS=comma,separated`
- Role-based Quick Drill (KM+EN) + attempt logging.
- Question bank loader is tolerant of JSON-with-comments (prevents crashes).

---

## 6) Data files (Termux)
JSON persistence lives in `./data/`:

- `customers.json`, `orders.json`, `inventory.json`
- `staff_progress.json`, `staff_profiles.json`, `staff_quiz_attempts.json`
- `staff_question_bank.json`
- `geocode_cache.json`

---

## 7) Commands (current)
Owner:
- `/diag`
- `/staff_test_order`
- `/academy`

---

## 8) Next build targets (menu schema → customer flow)
1) **Menu Bundle v1**: finalize schema + loader + shim with your production menu.
2) Customer ordering UX:
   - Best Sellers → Browse → Item builder (wings rules) → Cart → Checkout → Proof → Staff card → Status
3) Staff Academy expansion:
   - Fryer/Cook question set in °C (your SOP targets)
   - role progression + certification flow
4) Scorecard:
   - event log from staff actions
   - weekly grades + bonus tiers (no phone spying; bot events only)

---

## 9) Rollback
```bash
git log --oneline -n 20
git reset --hard <COMMIT>
bash scripts/termux_run.sh
```

## Menu Source of Truth (STOP RE-PATCHING THIS)

**Canonical menu bundle:** `menu/menu_bundle.v1.json`

**Canonical 70 flavor list (LOCKED):** `menu/flavors_70.lock.json`

To (re)apply the 70 locked flavors into the live menu bundle (no hand-editing):

```bash
cd ~/WINGBOSS_FINAL_BOT
npm run menu:apply70
```

This rewrites `menu/menu_bundle.v1.json` -> `flavors` array and then runs `npm run menu:check`.

### Flavors #1–#70 (LOCKED)

01. BUFFALO 🌶️
02. BAYOU BILLY 🌶️
03. BUFFA-O
04. BUFFALO-YAKI
05. DOUBLE BUFFALO 🌶️🌶️
06. GARGOYLE ☠️
07. BUFFALO DRIP 🌶️
08. MUFFALO 🌶️🌶️🌶️
09. MUFFA Q 🌶️🌶️
10. JAMAICAN JERK 🌶️
11. GODZILLA
12. GOJIRA 🌶️🌶️🌶️
13. JERKY 🌶️🌶️
14. JUGGALO 🌶️
15. MAN JERK 🌶️🌶️🌶️
16. VOLCANO ☠️ (IN-HOUSE ONLY)
17. HONEY TERIYAKI
18. MAUI
19. MAUL WOW WOWIE 🌶️🌶️ (IN-HOUSE ONLY)
20. PTERODACTYL
21. HOTTY 🌶️🌶️
22. TEMPEST 🌶️🌶️🌶️
23. MATT'S MISTAKE ☠️ (IN-HOUSE ONLY)
24. TRAIN TO BUSAN 🌶️
25. HONEY BUSAN
26. FLAME TO BUSAN ☠️
27. CONDUCTOR 🌶️
28. CHOO CHOO?
29. CHOO CHOO
30. BBQ
31. HBQ 🌶️🌶️
32. JBO
33. CHARLIE
34. SIMON SAYS 🌶️🌶️🌶️ (IN-HOUSE ONLY)
35. GOLD RUSH
36. SMOKIN YAKI
37. MANGO BBQ 🌶️🌶️
38. BARBARIAN ☠️ (IN-HOUSE ONLY)
39. KHMER CHILI SIEM REAP
40. HONEY KHMER
41. BATTAMBANG 🌶️🌶️🌶️
42. KMJ 🌶️🌶️
43. KUN KHMER ☠️
44. KHMER BBQ
45. FIRE BONG 🌶️🌶️🌶️
46. CITRIC FIRESTORM ☠️
47. BUFFALO STORM 🌶️🌶️🌶️
48. FOUR HORSEMAN ☢️
49. ANGRY JERK 🌶️🌶️🌶️
50. NITRO BBQ 🌶️🌶️🌶️
51. MONSOON 🌶️🌶️🌶️
52. FIRE YAKI 🌶️🌶️🌶️
53. ORION ☢️ (IN-HOUSE ONLY)
54. BUFFALO DRY 🌵 🌶️
55. KAMPOT HONEY PEPPER 🌵
56. MIDNIGHT RUB 🌵 🌶️
57. HOUSE BLEND 🌵
58. CAJUN 🌵 🌶️
59. LEMON PEPPER 🌵
60. KHMER STYLE
61. HONEY MUSTARD
62. HONEY GARLIC
63. NAKED
64. COMEBACK
65. SALT & MALT  (IN-HOUSE ONLY)
66. HOT HONEY 🌶️🌶️
67. HOT HONEY RANCH 🌶️
68. SPICY RANCH 🌶️🌶️
69. MANGO HABANERO ☢️ (IN-HOUSE ONLY)
70. ARMAGEDDON ☢️ (IN-HOUSE ONLY)

**IN-HOUSE ONLY (blocked on Telegram UI):** 16, 19, 23, 34, 38, 53, 65, 69, 70  
**Dry rubs (🌵):** 54–59


## LOCKED: Flavor Catalog (1–70)

This list is **the source of truth**. It lives in:

- `menu/flavors_70.lock.json` (editable master)
- `menu/menu_bundle.v1.json` (runtime bundle; should match the lock file)

Heat icons:
- 🌶️ = spicy (still upgradeable up to **Extreme**)
- ☠️ = Revenge-cap flavor (max **Revenge**)
- ☢️ = Nuclear-cap flavor (max **Nuclear**)

In-house only (not shown to customers in Telegram UI): **16, 19, 23, 34, 38, 53, 65, 69, 70**

### Flavor List
```
1. BUFFALO 🌶️
2. BAYOU BILLY 🌶️
3. BUFFA-O
4. BUFFALO-YAKI
5. DOUBLE BUFFALO 🌶️ 🌶️
6. GARGOYLE ☠️
7. BUFFALO DRIP 🌶️
8. MUFFALO 🌶️ 🌶️ 🌶️
9. MUFFA Q 🌶️ 🌶️
10. JAMAICAN JERK 🌶️
11. GODZILLA
12. GOJIRA 🌶️ 🌶️ 🌶️
13. JERKY 🌶️ 🌶️
14. JUGGALO 🌶️
15. MAN JERK 🌶️ 🌶️ 🌶️
16. VOLCANO ☠️
17. HONEY TERIYAKI
18. MAUI
19. MAUL WOW WOWIE 🌶️ 🌶️
20. PTERODACTYL
21. HOTTY 🌶️ 🌶️
22. TEMPEST 🌶️ 🌶️ 🌶️
23. MATT'S MISTAKE ☠️
24. TRAIN TO BUSAN 🌶️
25. HONEY BUSAN
26. FLAME TO BUSAN ☠️
27. CONDUCTOR 🌶️
28. CHOO CHOO?
29. CHOO CHOO
30. BBQ
31. HBQ 🌶️ 🌶️
32. JBO
33. CHARLIE
34. SIMON SAYS 🌶️ 🌶️ 🌶️
35. GOLD RUSH
36. SMOKIN YAKI
37. MANGO BBQ 🌶️ 🌶️
38. BARBARIAN ☠️
39. KHMER CHILI SIEM REAP
40. HONEY KHMER
41. BATTAMBANG 🌶️ 🌶️ 🌶️
42. KMJ 🌶️ 🌶️
43. KUN KHMER ☠️
44. KHMER BBQ
45. FIRE BONG 🌶️ 🌶️ 🌶️
46. CITRIC FIRESTORM ☠️
47. BUFFALO STORM 🌶️ 🌶️ 🌶️
48. FOUR HORSEMAN ☢️
49. ANGRY JERK 🌶️ 🌶️ 🌶️
50. NITRO BBQ 🌶️ 🌶️ 🌶️
51. MONSOON 🌶️ 🌶️ 🌶️
52. FIRE YAKI 🌶️ 🌶️ 🌶️
53. ORION ☢️
54. BUFFALO DRY 🌶️
55. KAMPOT HONEY PEPPER
56. MIDNIGHT RUB 🌶️
57. HOUSE BLEND
58. CAJUN 🌶️
59. LEMON PEPPER
60. KHMER STYLE
61. HONEY MUSTARD
62. HONEY GARLIC
63. NAKED
64. COMEBACK
65. SALT & MALT
66. HOT HONEY 🌶️ 🌶️
67. HOT HONEY RANCH 🌶️
68. SPICY RANCH 🌶️ 🌶️
69. MANGO HABANERO ☢️
70. ARMAGEDDON ☢️
```

### Re-apply the 70-flavor lock into the bundle (idempotent)
```bash
npm run menu:apply70
npm run menu:check
```

