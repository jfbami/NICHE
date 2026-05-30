import { Router } from 'express';
import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
  deleteFile,
} from '../lib/box.js';
import { newSpotId } from '../utils/ids.js';
import { httpError, asyncHandler } from '../utils/http.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

function toIndexEntry(spot, saveCount = 0) {
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
    saveCount,
  };
}

function adjustSaveCount(spotId, delta) {
  return updateJsonFile('spots_index.json', (index) =>
    index.map((entry) =>
      entry.id === spotId
        ? { ...entry, saveCount: Math.max(0, (entry.saveCount ?? 0) + delta) }
        : entry,
    ),
  );
}

function canSee(spot, userId, friendIds) {
  return spot.isPublic || spot.ownerId === userId || friendIds.includes(spot.ownerId);
}

async function loadFriendIds(userId) {
  if (!userId) return [];
  try {
    const friends = await readJsonFile(`user_data/${userId}/friends.json`);
    return friends
      .filter((entry) => entry.status === 'accepted')
      .map((entry) => entry.userId);
  } catch {
    return [];
  }
}

async function readSpotOr404(id) {
  try {
    return await readJsonFile(`spots/${id}.json`);
  } catch {
    throw httpError(404, 'spot not found');
  }
}

function parseBounds(query) {
  const { swLat, swLng, neLat, neLng } = query;
  if ([swLat, swLng, neLat, neLng].some((value) => value === undefined)) return null;
  return { swLat: +swLat, swLng: +swLng, neLat: +neLat, neLng: +neLng };
}

function inBounds(spot, bounds) {
  if (!bounds) return true;
  return (
    spot.lat >= bounds.swLat &&
    spot.lat <= bounds.neLat &&
    spot.lng >= bounds.swLng &&
    spot.lng <= bounds.neLng
  );
}

function applyUpdates(spot, body) {
  const editable = ['title', 'description', 'isPublic', 'tags', 'lat', 'lng', 'photoId', 'photoUrl'];
  const updated = { ...spot };
  for (const field of editable) {
    if (body[field] !== undefined) updated[field] = body[field];
  }
  updated.updatedAt = new Date().toISOString();
  return updated;
}

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { title, description, lat, lng, isPublic, photoId, photoUrl, tags } = req.body;
    if (!title || typeof lat !== 'number' || typeof lng !== 'number') {
      throw httpError(400, 'title, lat, and lng are required');
    }
    const now = new Date().toISOString();
    const spot = {
      id: newSpotId(),
      title,
      description: description || '',
      lat,
      lng,
      isPublic: isPublic !== false,
      ownerId: req.user.userId,
      ownerUsername: req.user.username,
      photoId: photoId || null,
      photoUrl: photoUrl || null,
      tags: Array.isArray(tags) ? tags : [],
      source: 'user',
      redditPostUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    await writeJsonFile(`spots/${spot.id}.json`, spot);
    await updateJsonFile('spots_index.json', (index) => [...index, toIndexEntry(spot)]);
    res.status(201).json(spot);
  }),
);

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const bounds = parseBounds(req.query);
    const userId = req.user?.userId;
    const friendIds = await loadFriendIds(userId);
    const index = await readJsonFile('spots_index.json');
    const visible = index.filter(
      (spot) => inBounds(spot, bounds) && canSee(spot, userId, friendIds),
    );
    res.json(visible);
  }),
);

router.get(
  '/saved',
  requireAuth,
  asyncHandler(async (req, res) => {
    const savedIds = await readJsonFile(`user_data/${req.user.userId}/saved.json`);
    const savedSet = new Set(savedIds);
    const index = await readJsonFile('spots_index.json');
    res.json(index.filter((spot) => savedSet.has(spot.id)));
  }),
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const spot = await readSpotOr404(req.params.id);
    const friendIds = await loadFriendIds(req.user?.userId);
    if (!canSee(spot, req.user?.userId, friendIds)) {
      throw httpError(403, 'this spot is private');
    }
    res.json(spot);
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const spot = await readSpotOr404(req.params.id);
    if (spot.ownerId !== req.user.userId) throw httpError(403, 'not your spot');
    const updated = applyUpdates(spot, req.body);
    await writeJsonFile(`spots/${spot.id}.json`, updated);
    await updateJsonFile('spots_index.json', (index) =>
      index.map((entry) =>
        entry.id === spot.id ? toIndexEntry(updated, entry.saveCount ?? 0) : entry,
      ),
    );
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const spot = await readSpotOr404(req.params.id);
    if (spot.ownerId !== req.user.userId) throw httpError(403, 'not your spot');
    await deleteFile(`spots/${spot.id}.json`);
    await updateJsonFile('spots_index.json', (index) =>
      index.filter((entry) => entry.id !== spot.id),
    );
    res.status(204).end();
  }),
);

router.post(
  '/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    await readSpotOr404(req.params.id);
    let added = false;
    const saved = await updateJsonFile(`user_data/${req.user.userId}/saved.json`, (ids) => {
      if (ids.includes(req.params.id)) return ids;
      added = true;
      return [...ids, req.params.id];
    });
    if (added) await adjustSaveCount(req.params.id, 1);
    res.json({ saved });
  }),
);

router.delete(
  '/:id/save',
  requireAuth,
  asyncHandler(async (req, res) => {
    let removed = false;
    const saved = await updateJsonFile(`user_data/${req.user.userId}/saved.json`, (ids) => {
      if (!ids.includes(req.params.id)) return ids;
      removed = true;
      return ids.filter((savedId) => savedId !== req.params.id);
    });
    if (removed) await adjustSaveCount(req.params.id, -1);
    res.json({ saved });
  }),
);

export default router;
