import { Router } from 'express';
import { writeJsonFile, updateJsonFile, uploadPhoto } from '../lib/box.js';
import { fetchRedditPosts, fetchInstagramPostsByHashtags, fetchTikTokSpotsByHashtags } from '../lib/apify.js';
import { geocode } from '../lib/geocode.js';
import { extractSpotFromPost } from '../lib/extractor.js';
import { verifyGeocodedSpot } from '../lib/verifier.js';
import { extractSpotFromTikTok } from '../lib/tiktokExtractor.js';
import { newSpotId, newPhotoId } from '../utils/ids.js';
import { asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DEFAULT_REDDIT_QUERY = 'seattle hidden gem spots';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const DEFAULT_INSTAGRAM_HASHTAGS = [
  'seattlehiddengems',
  'pnwhiddengems',
  'secretseattle',
];
const DEFAULT_INSTAGRAM_PER_TAG = 15;
const MAX_INSTAGRAM_PER_TAG = 50;

function clampLimit(raw, fallback, max) {
  const n = Number(raw) || fallback;
  return Math.min(Math.max(n, 1), max);
}

function parseRedditInput(body) {
  const query =
    typeof body.query === 'string' && body.query.trim() ? body.query : DEFAULT_REDDIT_QUERY;
  return { query, limit: clampLimit(body.limit, DEFAULT_LIMIT, MAX_LIMIT) };
}

function parseInstagramInput(body) {
  const hashtags =
    Array.isArray(body.hashtags) && body.hashtags.length > 0
      ? body.hashtags
      : DEFAULT_INSTAGRAM_HASHTAGS;
  return {
    hashtags,
    resultsPerHashtag: clampLimit(
      body.resultsPerHashtag,
      DEFAULT_INSTAGRAM_PER_TAG,
      MAX_INSTAGRAM_PER_TAG,
    ),
  };
}

function toIndexEntry(spot) {
  return {
    id: spot.id,
    title: spot.title,
    lat: spot.lat,
    lng: spot.lng,
    isPublic: spot.isPublic,
    ownerId: spot.ownerId,
    photoUrl: spot.photoUrl,
    createdAt: spot.createdAt,
    source: spot.source ?? 'user',
    visibility: spot.visibility ?? (spot.isPublic ? 'public' : 'friends'),
    saveCount: 0,
  };
}

async function redditPostToSpot(post, user) {
  const candidate = await geocode(post.title);
  if (!candidate) return null;
  const now = new Date().toISOString();
  return {
    id: newSpotId(),
    title: post.title,
    description: post.body?.slice(0, 1000) ?? '',
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    isPublic: true,
    ownerId: user.userId,
    ownerUsername: user.username,
    photoId: null,
    photoUrl: null,
    tags: post.subreddit ? [post.subreddit] : [],
    source: 'reddit',
    redditPostUrl: post.url,
    createdAt: now,
    updatedAt: now,
  };
}

async function importPhotoToBox(displayUrl) {
  if (!displayUrl) return { photoId: null, photoUrl: null };
  const response = await fetch(displayUrl);
  if (!response.ok) return { photoId: null, photoUrl: null };
  const buffer = Buffer.from(await response.arrayBuffer());
  const photoId = newPhotoId();
  const { url } = await uploadPhoto(photoId, buffer);
  return { photoId, photoUrl: url };
}

function passesExtractionFilter(extracted) {
  if (!extracted) return false;
  if (!extracted.isNicheGem) return false;
  if (!extracted.placeName) return false;
  if (!extracted.searchQuery) return false;
  if (extracted.confidence === 'low') return false;
  return true;
}

async function instagramPostToSpot(post, user) {
  const extracted = await extractSpotFromPost(post);
  if (!passesExtractionFilter(extracted)) return null;

  const candidate = await geocode(extracted.searchQuery);
  if (!candidate) return null;

  const verdict = await verifyGeocodedSpot({ extracted, candidate });
  if (!verdict?.matches) return null;

  const { photoId, photoUrl } = await importPhotoToBox(post.displayUrl);
  const now = new Date().toISOString();
  return {
    id: newSpotId(),
    title: extracted.placeName,
    description: extracted.blurb ?? '',
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    isPublic: true,
    ownerId: user.userId,
    ownerUsername: user.username,
    photoId,
    photoUrl,
    tags: [extracted.category, extracted.neighborhood].filter(Boolean),
    source: 'instagram',
    instagramPostUrl: post.postUrl,
    createdAt: now,
    updatedAt: now,
  };
}

async function persistSpots(spots) {
  if (spots.length === 0) return;
  await Promise.all(spots.map((spot) => writeJsonFile(`spots/${spot.id}.json`, spot)));
  await updateJsonFile('spots_index.json', (index) => [...index, ...spots.map(toIndexEntry)]);
}

router.post(
  '/reddit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { query, limit } = parseRedditInput(req.body);
    const posts = await fetchRedditPosts({ query, limit });
    const candidates = await Promise.all(posts.map((post) => redditPostToSpot(post, req.user)));
    const created = candidates.filter(Boolean);
    await persistSpots(created);
    res.json({ imported: created.length, spots: created });
  }),
);

router.post(
  '/instagram',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hashtags, resultsPerHashtag } = parseInstagramInput(req.body);
    const posts = await fetchInstagramPostsByHashtags({ hashtags, resultsPerHashtag });
    const candidates = await Promise.all(
      posts.map((post) => instagramPostToSpot(post, req.user).catch(() => null)),
    );
    const created = candidates.filter(Boolean);
    await persistSpots(created);
    res.json({
      imported: created.length,
      scanned: posts.length,
      spots: created,
    });
  }),
);

// ── TikTok ────────────────────────────────────────────────────────────────────

const DEFAULT_TIKTOK_HASHTAGS = ['seattlespot'];
const DEFAULT_TIKTOK_MAX_ITEMS = 50;
const MAX_TIKTOK_ITEMS = 100;

function parseTikTokInput(body) {
  const hashtags =
    Array.isArray(body.hashtags) && body.hashtags.length > 0
      ? body.hashtags
      : DEFAULT_TIKTOK_HASHTAGS;
  return {
    hashtags,
    maxItems: clampLimit(body.maxItems, DEFAULT_TIKTOK_MAX_ITEMS, MAX_TIKTOK_ITEMS),
  };
}

function hasSpecificAddress(address) {
  // Reject bare state/country strings (no digits = no zip or street number)
  return Boolean(address) && /\d/.test(address);
}

function engagementScore(item) {
  return item.playCount + item.diggCount * 5 + item.shareCount * 10;
}

function deduplicateByLocation(items) {
  const byName = new Map();
  for (const item of items) {
    const key = item.locationName.toLowerCase();
    const existing = byName.get(key);
    if (!existing || engagementScore(item) > engagementScore(existing)) {
      byName.set(key, item);
    }
  }
  return [...byName.values()].sort((a, b) => engagementScore(b) - engagementScore(a));
}

function passesTokFilter(extracted) {
  if (!extracted) return false;
  if (!extracted.isNicheGem) return false;
  if (!extracted.placeName) return false;
  if (extracted.confidence === 'low') return false;
  return true;
}

async function tiktokItemToSpot(item, user) {
  const extracted = await extractSpotFromTikTok(item);
  if (!passesTokFilter(extracted)) return null;

  const candidate = await geocode(item.address);
  if (!candidate) return null;

  const now = new Date().toISOString();
  return {
    id: newSpotId(),
    title: extracted.placeName,
    description: extracted.blurb ?? '',
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    isPublic: true,
    ownerId: user.userId,
    ownerUsername: user.username,
    photoId: null,
    photoUrl: null,
    tags: [extracted.category, extracted.neighborhood].filter(Boolean),
    source: 'tiktok',
    tiktokVideoUrl: item.videoUrl,
    engagement: { plays: item.playCount, likes: item.diggCount, shares: item.shareCount },
    createdAt: now,
    updatedAt: now,
  };
}

router.post(
  '/tiktok',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { hashtags, maxItems } = parseTikTokInput(req.body);
    const raw = await fetchTikTokSpotsByHashtags({ hashtags, maxItems });

    const withLocation = raw.filter((item) => item.locationName && hasSpecificAddress(item.address));
    const ranked = deduplicateByLocation(withLocation);

    const candidates = await Promise.all(
      ranked.map((item) => tiktokItemToSpot(item, req.user).catch(() => null)),
    );
    const created = candidates.filter(Boolean);
    await persistSpots(created);
    res.json({
      imported: created.length,
      scanned: raw.length,
      candidates: ranked.length,
      spots: created,
    });
  }),
);

export default router;
