# 🗺️ Neesh

**Discover and share the niche spots that aren't on the map.**

Neesh is a mobile-first map app for the hidden gems mainstream maps miss — the local taco stand, the secret basketball hoop, the viewpoint only locals know. Users drop pins on spots they love, choose whether each one is **public** or **friends-only**, and discover, save, and share spots from others. An AI pipeline continuously seeds the map with real hidden gems scraped from social media.

Built for the **Cascadia AI Hackathon 2026**.

> **Prize integrations:** Neesh uses **Box** as its entire database + file store, **Apify** to scrape hidden-gem suggestions from Reddit, Instagram & TikTok, **AWS Bedrock** (Claude Haiku) to judge and describe each scraped spot, and **AWS / Vercel** for hosting.

---

## ✨ What makes Neesh different

- **Box is the whole backend datastore.** No Postgres, no Supabase, no Mongo. Every user, spot, and photo lives in Box as JSON files and media — making Box a first-class, inspectable database you can literally browse in the Box web UI.
- **AI-curated discovery.** A scraping → extraction → verification → geocoding pipeline turns raw TikTok/Instagram/Reddit posts into clean, deduplicated map pins. Claude Haiku 4.5 (via AWS Bedrock) decides whether each location is a genuine niche gem (not a tourist trap or chain) and writes a one-line blurb.
- **Privacy-first sharing.** Each spot is public, friends-only, or private. The backend enforces visibility before any Box read.
- **Native mobile feel.** Add-to-home-screen PWA with an "n" icon, native iOS share sheet (iMessage/AirDrop), camera capture, and distance-based "what's near me" filtering.

---

## 🏗️ Architecture

```
┌──────────────┐    HTTPS / JSON    ┌──────────────────┐     Box SDK      ┌─────────────┐
│  React UI    │  ───────────────▶  │   Express API     │  ─────────────▶  │    Box      │
│ (MapLibre GL)│  ◀───────────────  │   (Node.js)       │  ◀─────────────  │  database   │
│   Vercel     │     JWT auth       │   AWS App Runner  │   JSON + photos  │  + storage  │
└──────────────┘                    └──────────────────┘                  └─────────────┘
                                            │
                          ┌─────────────────┼──────────────────┐
                          ▼                  ▼                  ▼
                  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                  │ Apify        │   │ AWS Bedrock  │   │ Nominatim /  │
                  │ scrapers     │   │ Claude Haiku │   │ Mapbox /     │
                  │ (TikTok/IG/  │   │ extract +    │   │ Google Maps  │
                  │  Reddit)     │   │ verify spots │   │ geocoding    │
                  └──────────────┘   └──────────────┘   └──────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind 4 + shadcn/ui (Radix) + **MapLibre GL JS** |
| Backend | Node.js + Express |
| Database + Storage | **Box** (JSON files + photo media) |
| Auth | Custom JWT (HS256) + bcrypt — users never touch Box directly |
| AI extraction | **AWS Bedrock** — Claude Haiku 4.5 (tool-use, prompt caching) |
| Scraping | **Apify** — TikTok, Instagram & Reddit actors |
| Geocoding | Google Maps (Apify) → Mapbox → Nominatim fallback chain |
| Backend hosting | **AWS** App Runner |
| Frontend hosting | **Vercel** |

### How Box is used as a database

```
/neesh/                              ← root folder (auto-created on boot)
├── users.json                       ← all user records (id, username, email, bcrypt hash)
├── spots_index.json                 ← lightweight index for fast geo queries + save counts
├── spots/
│   └── {spotId}.json                ← one file per full spot record
├── photos/
│   └── {photoId}.jpg                ← uploaded photo media (served via Box shared links)
└── user_data/
    └── {userId}/
        ├── saved.json               ← that user's saved/liked spot IDs
        └── friends.json             ← that user's friend records + status
```

- **Reads** stream a file from Box and parse JSON.
- **Writes** upload a new file version. Concurrent writes to the same file are serialized by an in-process async mutex (`fileLock.js`), so the single App Runner container is race-safe.
- **Photos** are uploaded to Box, then given an open shared link whose direct URL is embeddable in `<img>` tags.

---

## 🤖 The AI seeding pipeline

The heart of Neesh's content. Each `POST /api/seed/*` route runs the same shape of pipeline:

```
Apify scrape ──▶ pre-filter ──▶ Claude Haiku extract ──▶ geocode ──▶ (verify) ──▶ dedupe ──▶ Box
  (by hashtag)   (has address?)   (niche gem? blurb?)    (→ lat/lng)  (IG only)   (≤150 m)
```

1. **Scrape** — Apify pulls posts for a hashtag (e.g. `#seattlespot`) or search, including each post's structured `locationMeta`, engagement counts, and caption.
2. **Pre-filter** — drop posts with no specific street address; deduplicate by location name, keeping the highest-engagement video per venue (`plays + likes×5 + shares×10`).
3. **Extract** (`lib/extractor.js`, `lib/tiktokExtractor.js`) — Claude Haiku 4.5 reads the post and, via a `record_spot` tool call, decides `isNicheGem` (rejecting tourist traps, chains, neighborhoods, self-promo) and writes a warm one-sentence `blurb`, `category`, `neighborhood`, and `confidence`.
4. **Geocode** (`lib/geocode.js`) — resolve the address to coordinates through a Google Maps → Mapbox fallback chain.
5. **Verify** (Instagram only, `lib/verifier.js`) — a second Haiku call confirms the geocoder result actually matches the venue the post described, since IG captions are free-text. TikTok skips this — its `locationMeta` address is already structured.
6. **Dedupe** — skip any candidate within 150 m of an existing spot (haversine).
7. **Persist** — write each surviving spot to Box and append to the index, tagged `source: "tiktok" | "instagram" | "reddit"` so the UI can show a **"neesh recommended"** badge.

---

## 📁 Project structure

```
neesh/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express entry; inits Box folders, mounts routes
│   │   ├── lib/
│   │   │   ├── boxClient.js         # Box SDK singleton (JWT / CCG auth)
│   │   │   ├── box.js               # Box service layer: read/write/update/delete/upload
│   │   │   ├── fileLock.js          # In-process mutex for concurrent-safe writes
│   │   │   ├── apify.js             # Apify actor calls (TikTok / Instagram / Reddit / Google Maps)
│   │   │   ├── extractor.js         # Bedrock Claude — Instagram caption → spot
│   │   │   ├── tiktokExtractor.js   # Bedrock Claude — TikTok location → spot
│   │   │   ├── verifier.js          # Bedrock Claude — geocode-match verification
│   │   │   └── geocode.js           # Google Maps → Mapbox geocoding chain
│   │   ├── middleware/
│   │   │   ├── auth.js              # requireAuth / optionalAuth (JWT)
│   │   │   └── errorHandler.js      # Central error → JSON responder
│   │   ├── routes/
│   │   │   ├── auth.js              # register / login / me
│   │   │   ├── spots.js             # spot CRUD + geo query + save/unsave
│   │   │   ├── photos.js            # photo upload to Box
│   │   │   ├── users.js             # friends: list / request / accept / remove
│   │   │   ├── seed.js              # AI seeding: /reddit, /instagram, /tiktok
│   │   │   └── geocode.js           # address autocomplete (Nominatim)
│   │   ├── utils/                   # ids (nanoid), http helpers
│   │   └── scripts/                 # initBox, debug helpers
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/                      # PWA manifest + "n" home-screen icons
│   ├── src/app/
│   │   ├── App.tsx                  # root shell, tab nav, dialog wiring
│   │   ├── components/
│   │   │   ├── MapTab.tsx           # MapLibre map, pins, placement mode, distance filter
│   │   │   ├── AddLocationDialog.tsx# add-spot form: address autocomplete + photo capture
│   │   │   ├── LocationCard.tsx     # explore/favorites card + like counter + badges
│   │   │   ├── LocationDetailsDialog.tsx
│   │   │   ├── ShareDialog.tsx      # desktop share fallback
│   │   │   ├── FriendsPanel.tsx / FriendProfileSheet.tsx
│   │   │   └── AuthScreen.tsx
│   │   ├── hooks/                   # useSpots, useFavorites, useFriends, useRecommendations
│   │   └── lib/                     # api client, auth storage, spot adapter
│   └── package.json
├── CLAUDE.md                        # Engineering conventions & clean-code rules
└── README.md
```

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A **Box** developer app with **JWT Server Authentication** (downloads a `*_config.json` keypair)
  - App Access Level: **App + Enterprise Access**, Scope: **Write all files and folders**, authorized in the Box Admin Console
- An **Apify** API token (for seeding)
- **AWS Bedrock** access to Claude Haiku 4.5 (for extraction/verification)
- *(Optional)* a **Mapbox** token for higher-quality geocoding

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit (see below)
npm run init-box            # one-time: create /neesh tree, prints the root folder ID
npm start                   # http://localhost:3000   (npm run dev for --watch)
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
npm run dev                 # http://localhost:5173
```

### Environment variables (`backend/.env`)

```bash
# Box
BOX_CONFIG_PATH=../your_box_config.json   # path to the Box JWT config JSON
NEESH_ROOT_FOLDER_ID=                      # from `npm run init-box`

# App
NEESH_JWT_SECRET=replace-with-long-random  # signs auth tokens
PORT=3000
NEESH_ADMIN_EMAILS=admin@neesh.app         # comma-separated; can delete any spot

# Apify (Reddit + Instagram + TikTok scrapers)
APIFY_API_TOKEN=
APIFY_TIKTOK_ACTOR=clockworks~free-tiktok-scraper

# AWS Bedrock (Claude Haiku 4.5 — extraction + verification)
AWS_BEARER_TOKEN_BEDROCK=
AWS_REGION=us-east-2
BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0

# Geocoding (optional — falls back to Apify Google Maps + Nominatim)
MAPBOX_TOKEN=
```

> 🔒 The Box config file and `.env` are gitignored — secrets never get committed.

---

## 📡 API reference

All responses are JSON. Authenticated routes expect `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Auth | Body / Notes |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | `{ username, email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | ✅ | current user |

### Spots
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/spots` | ✅ | Create. `{ title, description?, address?, lat, lng, visibility?, photoId?, photoUrl?, tags? }` |
| `GET` | `/api/spots` | optional | Geo query (`swLat,swLng,neLat,neLng`); returns spots visible to caller |
| `GET` | `/api/spots/saved` | ✅ | caller's saved/liked spots |
| `GET` | `/api/spots/:id` | optional | full record (403 if private) |
| `PATCH` | `/api/spots/:id` | ✅ owner | update editable fields |
| `DELETE` | `/api/spots/:id` | ✅ owner/admin | remove spot + index entry |
| `POST` / `DELETE` | `/api/spots/:id/save` | ✅ | save/unsave (drives the like counter) |

### Photos
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/photos` | ✅ | `multipart/form-data` `photo` field (≤10 MB) → `{ photoId, boxFileId, url }` |

### Friends
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/users/me/friends` | ✅ | list friends + pending requests |
| `POST` | `/api/users/me/friends/request` | ✅ | `{ username }` |
| `POST` | `/api/users/me/friends/:friendId/accept` | ✅ | accept a request |
| `DELETE` | `/api/users/me/friends/:friendId` | ✅ | remove / decline |

### Seeding (AI pipeline)
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| `POST` | `/api/seed/tiktok` | ✅ | `{ hashtags?: string[], maxItems? }` |
| `POST` | `/api/seed/instagram` | ✅ | `{ hashtags?: string[], resultsPerHashtag? }` |
| `POST` | `/api/seed/reddit` | ✅ | `{ query?, limit? }` |

### Geocode & Health
| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/api/geocode/search?q=` | address autocomplete suggestions `[{ address, lat, lng }]` |
| `GET` | `/health` | `{ ok: true }` |

#### Example: seed the map from TikTok

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret"}' | jq -r .token)

curl -s -X POST localhost:3000/api/seed/tiktok \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"hashtags":["seattlespot"],"maxItems":100}'
# → { imported, scanned, candidates, spots: [...] }
```

---

## 🧭 Frontend features

- **Interactive map** (MapLibre) — custom warm earth-tone style, photo pins, and smaller serif **"n"** pins for spots without a photo.
- **Distance filter** — show spots within 1 / 5 / 10 / 25 / 50 miles of your location, plus public/friends/private visibility toggles.
- **Add a spot** — drop a pin on the map *or* search an address with live autocomplete; a photo is required (choose from library **or** take one with the camera).
- **Like counter & badges** — heart to like a spot (save count shown live); cards show **"neesh recommended"** (AI-seeded) or **"user recommended"** (community) tags.
- **Native sharing** — iOS share sheet titled `neesh: <spot>` (iMessage, AirDrop, copy link).
- **Friends** — send/accept requests, browse a friend's uploads, friends-only spots.
- **Install to home screen** — PWA manifest + apple-touch-icon render an "n" icon labelled **neesh**.

---

## ✅ Build status

| Step | Feature | Status |
|---|---|---|
| 0 | Project foundations | ✅ |
| 1 | Box connection + folder structure | ✅ |
| 2 | Auth (register / login / me) | ✅ |
| 3 | Spots CRUD + geo query + save/like | ✅ |
| 4 | Photo upload to Box | ✅ |
| 5 | Frontend map (MapLibre, pins, filters) | ✅ |
| 6 | Add-spot flow (address autocomplete + camera) | ✅ |
| 7 | Saved spots, favorites, recommendations | ✅ |
| 8 | AI seeding (Apify + Bedrock) — Reddit, Instagram, TikTok | ✅ |
| 9 | Friends system | ✅ |
| 10 | Deploy (AWS App Runner + Vercel) | ✅ |

---

## 🔐 Security notes
- Passwords hashed with bcrypt; never stored or returned in plaintext.
- The frontend never receives Box credentials — the backend is a trusted proxy that enforces ownership/visibility before any Box read or write.
- Secrets (`.env`, Box config) are gitignored.

---

## 📄 License
Built for the Cascadia AI Hackathon 2026.
