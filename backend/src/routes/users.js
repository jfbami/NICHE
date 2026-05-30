import { Router } from 'express';
import { readJsonFile, updateJsonFile } from '../lib/box.js';
import { httpError, asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const friendsKey = (userId) => `user_data/${userId}/friends.json`;

async function readFriends(userId) {
  try {
    return await readJsonFile(friendsKey(userId));
  } catch {
    return [];
  }
}

function withRelationship(list, otherUserId, status) {
  const withoutOther = list.filter((entry) => entry.userId !== otherUserId);
  return [...withoutOther, { userId: otherUserId, status }];
}

function setRelationship(ownerId, otherUserId, status) {
  return updateJsonFile(friendsKey(ownerId), (list) =>
    withRelationship(list, otherUserId, status),
  );
}

function dropRelationship(ownerId, otherUserId) {
  return updateJsonFile(friendsKey(ownerId), (list) =>
    list.filter((entry) => entry.userId !== otherUserId),
  );
}

async function usernamesById() {
  const users = await readJsonFile('users.json');
  return new Map(users.map((user) => [user.id, user.username]));
}

async function findUserByUsername(username) {
  const users = await readJsonFile('users.json');
  return users.find((user) => user.username === username) ?? null;
}

router.get(
  '/me/friends',
  requireAuth,
  asyncHandler(async (req, res) => {
    const friends = await readFriends(req.user.userId);
    const names = await usernamesById();
    res.json(
      friends.map((entry) => ({
        id: entry.userId,
        username: names.get(entry.userId) ?? 'unknown',
        displayName: names.get(entry.userId) ?? 'unknown',
        status: entry.status,
      })),
    );
  }),
);

router.post(
  '/me/friends/request',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.body;
    if (!username) throw httpError(400, 'username is required');

    const target = await findUserByUsername(username);
    if (!target) throw httpError(404, 'no user with that username');
    if (target.id === req.user.userId) throw httpError(400, 'cannot friend yourself');

    const myFriends = await readFriends(req.user.userId);
    const existing = myFriends.find((entry) => entry.userId === target.id);
    if (existing?.status === 'accepted') throw httpError(409, 'already friends');
    if (existing?.status === 'pending_sent') throw httpError(409, 'request already sent');

    const status = existing?.status === 'pending_received' ? 'accepted' : 'pending_sent';
    const theirStatus = status === 'accepted' ? 'accepted' : 'pending_received';
    await setRelationship(req.user.userId, target.id, status);
    await setRelationship(target.id, req.user.userId, theirStatus);
    res.status(201).json({ id: target.id, username: target.username, status });
  }),
);

router.post(
  '/me/friends/:friendId/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const myFriends = await readFriends(req.user.userId);
    const relationship = myFriends.find((entry) => entry.userId === req.params.friendId);
    if (relationship?.status !== 'pending_received') {
      throw httpError(400, 'no pending request from this user');
    }
    await setRelationship(req.user.userId, req.params.friendId, 'accepted');
    await setRelationship(req.params.friendId, req.user.userId, 'accepted');
    res.json({ id: req.params.friendId, status: 'accepted' });
  }),
);

router.delete(
  '/me/friends/:friendId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await dropRelationship(req.user.userId, req.params.friendId);
    await dropRelationship(req.params.friendId, req.user.userId);
    res.status(204).end();
  }),
);

export default router;
