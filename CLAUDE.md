# Neesh — Project Guide for Claude

## What This App Does
Neesh is a map-based app for sharing "niche" spots that don't appear on Google/Apple Maps (local taco stands, hidden basketball courts, etc.). Users upload spots, control visibility (public or friends-only), browse them on a map, and save/share them.

**Target form factor:** mobile phone — the frontend is built mobile-first and constrained to a phone-width canvas (max-width 430px in [App.tsx](frontend/src/app/App.tsx)).

**GitHub:** https://github.com/jfbami/NICHE

## Architecture
- **Frontend:** React 18 + Vite + Tailwind 4 + shadcn/ui (Radix primitives) + MapLibre GL JS
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
- `frontend/src/app/App.tsx` — root shell, bottom tab nav, dialog wiring
- `frontend/src/app/components/MapTab.tsx` — MapLibre map, spot pins, placement mode

### Naming gap (frontend ↔ backend)
The frontend prototype uses `Location { name, latitude, longitude, imageUrl, uploadedBy, uploadedAt, isPublic }`; the backend uses `Spot { title, lat, lng, photoUrl, ownerUsername, createdAt, isPublic }`. When wiring real API calls, translate at the API client boundary — do not leak either shape past the adapter.

---

## Clean Code Rules
Code is read 10× more than it's written. Optimize for readability and maintainability, not cleverness.

### Meaningful Names
- Use intention-revealing names that explain *why* something exists
- Avoid disinformation and meaningless distinctions (`data`, `info`, `manager`)
- Pronounceable and searchable names only
- Class names: nouns (`UserAccount`, `SpotRecord`); method names: verbs (`uploadPhoto`, `filterByBounds`)
- No Hungarian notation, no type prefixes

### Functions
- Keep functions small — under 20 lines ideal
- Do one thing only — Single Responsibility Principle
- One level of abstraction per function
- 0–2 arguments ideal, 3 maximum; avoid flag arguments
- No side effects — function does what its name says
- Separate commands (change state) from queries (return info)
- Prefer exceptions over error codes

### Comments
- Code should be self-explanatory — avoid comments when possible
- Good comments: legal info, warnings, TODOs, public API docs
- Bad comments: redundant, misleading, or explaining bad code
- Never comment out code — delete it (git preserves history)
- If you need a comment, consider refactoring instead

### Formatting
- Keep files small and focused
- Vertical: related concepts close together, blank lines separate concepts
- Horizontal: line length 80–100 characters
- Consistent 2-space indentation
- Group related functions together

### Objects and Data Structures
- Objects: hide data behind abstractions, expose behavior through methods
- Data structures: expose data, have minimal behavior
- Law of Demeter: only talk to immediate friends — avoid `a.getB().getC().doSomething()`
- Don't expose internal structure through getters/setters blindly

### Error Handling
- Use exceptions, not return codes or error flags
- Write try-catch-finally first when code might fail
- Provide context in exception messages
- Don't return `null` — return empty collections or throw
- Don't pass `null` as arguments
- Validate at system boundaries only (user input, Box API responses, Apify responses)

### Classes / Modules
- Single Responsibility Principle: one reason to change
- Small classes — measured by responsibilities, not lines
- High cohesion: class variables used by many methods
- Low coupling: minimal dependencies between classes
- Open/Closed Principle: open for extension, closed for modification
- Program to interfaces — avoid leaking Box SDK types into route handlers
- Favor composition over inheritance

### Unit Tests (F.I.R.S.T.)
- Fast, Independent, Repeatable, Self-validating, Timely
- One assert per test (or one concept)
- Test code quality equals production code quality
- Readable test names that describe what's being tested
- Arrange-Act-Assert pattern

### Code Quality Principles
- DRY (Don't Repeat Yourself): no duplication
- YAGNI (You Aren't Gonna Need It): don't build for hypothetical futures
- KISS (Keep It Simple): avoid unnecessary complexity
- Boy Scout Rule: leave code cleaner than you found it
- No half-finished implementations
- No backwards-compatibility hacks

### Code Smells to Avoid
- Long functions or classes
- Duplicate code
- Dead code (unused variables, functions, parameters, imports)
- Feature envy (method more interested in another class)
- Inappropriate intimacy (classes knowing too much about each other)
- Long parameter lists
- Primitive obsession (overusing primitives instead of small objects)
- Switch/case statements (consider polymorphism)
- Temporary fields (class variables only used sometimes)

### Concurrency
- Keep concurrent code separate from other code
- Limit scope of synchronized/locked data
- Use thread-safe collections
- Keep synchronized sections small
- Know your execution model and primitives (see `backend/src/lib/fileLock.js` for the Box-write mutex)

### System Design
- Separate construction from use (dependency injection)
- Use factories or builders for complex object creation
- Program to interfaces, not implementations
- Favor composition over inheritance
- Apply design patterns only when they simplify

### Refactoring
- Refactor continuously, not in big batches
- Always have passing tests before and after
- Small steps — one change at a time
- Common refactorings: Extract Method, Rename, Move, Inline

### Documentation
- Self-documenting code > comments > external docs
- Public APIs need clear documentation
- Include examples in API documentation
- Keep docs close to code (ideally in code)

---

## Step-by-Step Build Plan
Steps: 0 (foundations) → 1 (Box) → 2 (Auth) → 3 (Spots CRUD) → 4 (Photos) → 5 (Frontend map) → 6 (Add spot) → 7 (Saved spots) → 8 (Apify) → 9 (Deploy)

## Environment Variables
```
# backend/.env
BOX_CONFIG_PATH=./box_config.json
NEESH_ROOT_FOLDER_ID=
NEESH_JWT_SECRET=
PORT=3000
APIFY_API_TOKEN=
MAPBOX_TOKEN=

# frontend/.env
VITE_MAPBOX_TOKEN=
VITE_API_BASE_URL=
```
