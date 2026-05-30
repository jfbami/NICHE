import { Router } from 'express';
import { writeJsonFile, updateJsonFile, uploadPhoto } from '../lib/box.js';
import { fetchRedditPosts, fetchInstagramPostsByHashtags } from '../lib/apify.js';
import { geocode } from '../lib/geocode.js';
import { extractSpotFromPost } from '../lib/extractor.js';
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
  };
}

async function redditPostToSpot(post, user) {
  const coords = await geocode(post.title);
  if (!coords) return null;
  const now = new Date().toISOString();
  return {
    id: newSpotId(),
    title: post.title,
    description: post.body?.slice(0, 1000) ?? '',
    lat: coords.lat,
    lng: coords.lng,
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

function buildGeocodeQuery(extracted) {
  return [extracted.placeName, extracted.addressHint, extracted.neighborhood, 'Seattle']
    .filter(Boolean)
    .join(', ');
}

async function instagramPostToSpot(post, user) {
  const extracted = await extractSpotFromPost(post);
  if (!extracted?.isNicheGem || !extracted.placeName) return null;
  if (extracted.confidence === 'low') return null;

  const coords = await geocode(buildGeocodeQuery(extracted));
  if (!coords) return null;

  const { photoId, photoUrl } = await importPhotoToBox(post.displayUrl);
  const now = new Date().toISOString();
  return {
    id: newSpotId(),
    title: extracted.placeName,
    description: post.caption?.slice(0, 1000) ?? '',
    lat: coords.lat,
    lng: coords.lng,
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

export default router;
