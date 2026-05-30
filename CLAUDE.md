# Neesh — Project Guide for Claude

## What This App Does
Neesh is a map-based app for sharing "niche" spots that don't appear on Google/Apple Maps (local taco stands, hidden basketball courts, etc.). Users upload spots, control visibility (public or friends-only), browse them on a map, and save/share them.

**GitHub:** https://github.com/jfbami/NICHE

## Architecture
- **Frontend:** React + Vite + Tailwind CSS + Mapbox GL JS
- **Backend:** Node.js + Express (AWS App Runner)
- **Database + Storage:** Box (all JSON files + photos — no external DB)
- **Auth:** Custom JWT (HS256); users never touch Box directly
- **Scraping:** Apify Reddit scraper for hidden gem seed data

### Box Folder Structure
```
/neesh/
├── users.json                    ← array of all user records
├── spots_index.json              ← lightweight index for geo queries
├── spots/{spotId}.json           ← full spot records
├── photos/{photoId}.jpg          ← photo uploads
└── user_data/{userId}/
    ├── saved.json
    └── friends.json
```

### Key Files
- `backend/src/lib/box.js` — entire Box service layer (read/write JSON, upload photos, init folders)
- `backend/src/lib/boxClient.js` — Box SDK JWT singleton
- `backend/src/lib/fileLock.js` — in-process async mutex for concurrent writes
- `backend/src/routes/spots.js` — geo bounding box filter + CRUD
- `backend/src/routes/auth.js` — register/login with users.json
- `frontend/src/pages/MapPage.jsx` — Mapbox map, spot pins, add spot modal

## Clean Code Rules

### Naming
- Use intention-revealing names that explain *why* something exists
- Classes: nouns (`UserAccount`, `SpotRecord`); Methods: verbs (`uploadPhoto`, `filterByBounds`)
- No Hungarian notation, no `data`/`info`/`manager` suffix names
- Pronounceable, searchable names only

### Functions
- Keep functions under 20 lines
- One responsibility per function
- Max 3 parameters; avoid flag arguments
- No side effects — function does what its name says
- Separate commands (change state) from queries (return info)
- Prefer exceptions over error codes

### Comments
- Code should be self-explanatory — avoid comments when possible
- Only comment when the WHY is non-obvious: hidden constraint, subtle invariant, external bug workaround
- Never comment out code — delete it (git preserves history)
- No docstrings explaining what a function does (the name does that)

### Formatting
- Line length: 80–100 characters
- Blank lines separate logical concepts
- Related functions grouped together
- Consistent 2-space indentation

### Error Handling
- Use exceptions, not return codes or error flags
- Provide context in error messages
- Don't return null — return empty arrays/objects or throw
- Validate at system boundaries only (user input, Box API responses, Apify responses)

### Classes / Modules
- Single Responsibility Principle: one reason to change
- Program to interfaces — avoid leaking Box SDK types into route handlers
- Favor composition over inheritance

### Code Quality
- DRY: no duplication
- YAGNI: don't build for hypothetical futures
- KISS: avoid unnecessary complexity
- No half-finished implementations
- No backwards-compatibility hacks

### Code Smells to Avoid
- Long functions or files
- Duplicate code
- Dead code (unused variables, functions, imports)
- Long parameter lists
- Primitive obsession — use small objects for structured data

## Step-by-Step Build Plan
See: `/Users/alexskibinski/.claude/plans/generate-a-plan-for-sleepy-garden.md`

Steps: 0 (foundations) → 1 (Box) → 2 (Auth) → 3 (Spots CRUD) → 4 (Photos) → 5 (Frontend map) → 6 (Add spot) → 7 (Saved spots) → 8 (Apify) → 9 (Deploy)

## Environment Variables
```
# backend/.env
BOX_CONFIG_PATH=./box_config.json
NEESH_ROOT_FOLDER_ID=
NEESH_JWT_SECRET=
PORT=3000
APIFY_API_TOKEN=

# frontend/.env
VITE_MAPBOX_TOKEN=
VITE_API_BASE_URL=
```
