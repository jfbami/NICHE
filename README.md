# 🗺️ Neesh

**Discover and share the niche spots that aren't on the map.**

Neesh is a map-based app for the hidden gems mainstream maps miss — the local taco stand, the secret basketball hoop, the viewpoint only locals know. Users drop pins on spots they love, choose whether each one is **public** or **friends-only**, and discover, save, and share spots from others.

Built for the **Cascadia AI Hackathon 2026**.

> **Prize integrations:** Neesh uses **Box** as its entire database + file store, **Apify** to scrape hidden-gem suggestions from Reddit, and **AWS** to host the backend.

---

## ✨ What makes Neesh different

- **Box is the whole backend datastore.** No Postgres, no Supabase, no Mongo. Every user, spot, and photo lives in Box as JSON files and media — making Box a first-class, inspectable database you can literally browse in the Box web UI.
- **Privacy-first sharing.** Each spot is public, or visible only to your friends.
- **Community-seeded discovery.** An Apify Reddit scraper surfaces real "hidden gem" posts you can turn into map pins.

---

## 🏗️ Architecture

```
┌──────────────┐      HTTPS/JSON      ┌──────────────────┐       Box SDK        ┌─────────────┐
│  React UI    │  ───────────────▶    │  Express API      │  ────────────────▶   │    Box      │
│ (Mapbox GL)  │  ◀───────────────    │  (Node.js)        │  ◀────────────────   │  (database  │
│              │      JWT auth        │  AWS App Runner   │   JSON + photos      │  + storage) │
└──────────────┘                      └──────────────────┘                      └─────────────┘
                                              │
                                              │  Apify REST API
                                              ▼
                                      ┌──────────────────┐
                                      │ Apify Reddit      │
                                      │ scraper (seeds)   │
                                      └──────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS + Mapbox GL JS *(in progress — designed in Figma)* |
| Backend | Node.js + Express |
| Database + Storage | **Box** (JSON files + photo media) |
| Auth | Custom JWT (HS256) + bcrypt — users never touch Box directly |
| Scraping | **Apify** Reddit scraper *(planned)* |
| Backend hosting | **AWS** App Runner *(planned)* |
| Frontend hosting | Vercel *(planned)* |

### How Box is used as a database

```
/neesh/                              ← root folder (auto-created on boot)
├── users.json                       ← all user records (id, username, email, bcrypt hash)
├── spots_index.json                 ← lightweight index for fast geo queries
├── spots/
│   └── {spotId}.json                ← one file per full spot record
├── photos/
│   └── {photoId}.jpg                ← uploaded photo media (served via Box shared links)
└── user_data/
    └── {userId}/
        ├── saved.json               ← that user's saved spot IDs
        └── friends.json             ← that user's friend IDs
```

- **Reads** stream a file from Box and parse JSON.
- **Writes** upload a new file version. Concurrent writes to the same file are serialized by an in-process async mutex (`fileLock.js`), so the single App Runner container is race-safe.
- **Photos** are uploaded to Box, then given an open shared link whose direct URL is embeddable in `<img>` tags.

---

## 📁 Project structure

```
neesh/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express entry; inits Box folders, mounts routes
│   │   ├── lib/
│   │   │   ├── boxClient.js         # Box SDK singleton (auto-detects JWT vs CCG auth)
│   │   │   ├── box.js               # Box service layer: read/write/update/delete/upload
│   │   │   └── fileLock.js          # In-process mutex for concurrent-safe writes
│   │   ├── middleware/
│   │   │   ├── auth.js              # requireAuth / optionalAuth (JWT)
│   │   │   └── errorHandler.js      # Central error → JSON responder
│   │   ├── routes/
│   │   │   ├── auth.js              # register / login / me
│   │   │   ├── spots.js            # spot CRUD + geo query + save/unsave
│   │   │   └── photos.js           # photo upload to Box
│   │   ├── utils/
│   │   │   ├── ids.js               # nanoid-based id generators
│   │   │   └── http.js              # httpError + asyncHandler helpers
│   │   └── scripts/
│   │       └── initBox.js           # One-shot: create the /neesh folder tree
│   ├── .env.example
│   └── package.json
├── frontend/                        # React UI (in progress)
├── CLAUDE.md                        # Engineering conventions & clean-code rules
└── README.md
```

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A **Box** developer app with **JWT Server Authentication** (downloads a `*_config.json` with a keypair)
  - App Access Level: **App + Enterprise Access**
  - Scope: **Write all files and folders stored in Box**
  - Authorized in the Box Admin Console
- *(Later)* an **Apify** API token and a **Mapbox** token

### Backend setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# then edit .env (see below)

# Create the /neesh folder tree in your Box account (one time)
npm run init-box        # prints the root folder ID — paste it into NEESH_ROOT_FOLDER_ID

# Run the API
npm start               # http://localhost:3000
```

### Environment variables (`backend/.env`)

```bash
BOX_CONFIG_PATH=../your_box_config.json   # path to the Box JWT config JSON
NEESH_ROOT_FOLDER_ID=                      # set from `npm run init-box` output
NEESH_JWT_SECRET=replace-with-long-random  # signs auth tokens
PORT=3000
APIFY_API_TOKEN=                           # for the Apify seed feature (later)
```

> 🔒 The Box config file and `.env` are gitignored — secrets never get committed.

---

## 📡 API reference

All responses are JSON. Authenticated routes expect `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Body | Returns |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | — | `{ username, email, password }` | `{ token, user }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` | `{ token, user }` |
| `GET` | `/api/auth/me` | ✅ | — | `{ user }` |

### Spots

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/spots` | ✅ | Create. Body: `{ title, description?, lat, lng, isPublic?, photoId?, photoUrl?, tags? }` |
| `GET` | `/api/spots` | optional | Geo query. Params: `swLat, swLng, neLat, neLng`. Returns spots visible to the caller (public + own + friends) within the bounding box |
| `GET` | `/api/spots/saved` | ✅ | The caller's saved spots |
| `GET` | `/api/spots/:id` | optional | Full spot record (403 if private and not allowed) |
| `PATCH` | `/api/spots/:id` | ✅ owner | Update editable fields; keeps the index in sync |
| `DELETE` | `/api/spots/:id` | ✅ owner | Removes the spot + its index entry |
| `POST` | `/api/spots/:id/save` | ✅ | Save to the caller's collection |
| `DELETE` | `/api/spots/:id/save` | ✅ | Unsave |

### Photos

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/photos` | ✅ | `multipart/form-data` with a `photo` image field (≤10MB). Returns `{ photoId, boxFileId, url }`. The `url` is an embeddable Box shared link. |

### Health

| Method | Endpoint | Returns |
|---|---|---|
| `GET` | `/health` | `{ ok: true }` |

#### Example: create a spot with a photo

```bash
# 1) Log in
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret"}' | jq -r .token)

# 2) Upload a photo
URL=$(curl -s -X POST localhost:3000/api/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@taco-stand.jpg" | jq -r .url)

# 3) Create the spot
curl -s -X POST localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Secret Taco Stand\",\"lat\":47.6062,\"lng\":-122.3321,\"isPublic\":true,\"photoUrl\":\"$URL\"}"
```

---

## ✅ Build status

| Step | Feature | Status |
|---|---|---|
| 0 | Project foundations (structure, conventions) | ✅ Done |
| 1 | Box connection + folder structure | ✅ Done |
| 2 | Auth (register / login / me) | ✅ Done |
| 3 | Spots CRUD + geo query + save/unsave | ✅ Done |
| 4 | Photo upload to Box | ✅ Done |
| 5–7 | Frontend (map, auth, add spot, saved) | 🔧 In progress (Figma → React) |
| 8 | Apify "Find Hidden Gems" seeding | 📋 Planned |
| 9 | Deploy (AWS App Runner + Vercel) | 📋 Planned |

---

## 🗺️ Planned functionality (roadmap)

### Core (MVP)
- [x] **User accounts** — register, log in, JWT-secured sessions
- [x] **Drop a spot** — name, description, location, tags, photo
- [x] **Public vs. friends-only** visibility per spot
- [x] **Map discovery** — fetch spots within the current map viewport
- [x] **Save spots** to a personal collection
- [x] **Photo uploads** stored in Box, served via shared links
- [ ] **Interactive map UI** — Mapbox with color-coded pins (public vs. private)
- [ ] **Add-spot flow** — click map → fill form → upload photo → pin appears
- [ ] **Spot detail view** — photo, description, owner, save button
- [ ] **Saved spots page**

### Social
- [ ] **Friends** — add/remove friends (data model exists; endpoints + UI pending)
- [ ] **Share a spot** — generate a shareable link to any spot
- [ ] **See who saved / upvoted** a spot
- [ ] **Friend activity feed** — new spots from people you follow

### Discovery & content
- [ ] **Apify "Find Hidden Gems"** — scrape Reddit for local hidden-gem posts and turn them into draft pins
- [ ] **Categories & filters** — food, views, sports, art, etc.
- [ ] **Search** — by name, tag, or area
- [ ] **Geocoding** — turn an address into a pin (and vice versa)
- [ ] **"Near me"** — spots sorted by distance from current location

### Polish & stretch goals
- [ ] **Multiple photos per spot** (data model already supports a `photos` array)
- [ ] **Spot reviews / notes** from visitors
- [ ] **Collections / lists** — group spots ("Best tacos", "Sunset spots")
- [ ] **Offline-friendly** saved spots
- [ ] **Moderation / report** a spot
- [ ] **Map clustering** for dense areas

> Want to change scope? This list is meant to be edited — add, cut, or reprioritize anything here and we'll adjust the build plan.

---

## 🔐 Security notes
- Passwords hashed with bcrypt; never stored or returned in plaintext.
- The frontend never receives Box credentials — the backend is a trusted proxy that enforces ownership/visibility before any Box read or write.
- Secrets (`.env`, Box config) are gitignored.

---

## 📄 License
Built for the Cascadia AI Hackathon 2026.
