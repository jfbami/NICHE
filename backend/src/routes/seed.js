import { Router } from 'express';
import { writeJsonFile, updateJsonFile } from '../lib/box.js';
import { fetchRedditPosts } from '../lib/apify.js';
import { geocode } from '../lib/geocode.js';
import { newSpotId } from '../utils/ids.js';
import { asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DEFAULT_QUERY = 'seattle hidden gem spots';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseSeedInput(body) {
  const query = typeof body.query === 'string' && body.query.trim() ? body.query : DEFAULT_QUERY;
  const limitRaw = Number(body.limit) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);
  return { query, limit };
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

async function postToSpot(post, user) {
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

router.post(
  '/reddit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { query, limit } = parseSeedInput(req.body);
    const posts = await fetchRedditPosts({ query, limit });
    const candidates = await Promise.all(posts.map((post) => postToSpot(post, req.user)));
    const created = candidates.filter(Boolean);
    await Promise.all(created.map((spot) => writeJsonFile(`spots/${spot.id}.json`, spot)));
    if (created.length > 0) {
      await updateJsonFile('spots_index.json', (index) => [
        ...index,
        ...created.map(toIndexEntry),
      ]);
    }
    res.json({ imported: created.length, spots: created });
  }),
);

export default router;
