import { Router } from 'express';
import { readJsonFile, updateJsonFile } from '../lib/box.js';
import { httpError, asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const friendsKey = (userId) => `user_data/${userId}/friends.json`;

router.get(
  '/me/friends',
  requireAuth,
  asyncHandler(async (req, res) => {
    const friends = await readJsonFile(friendsKey(req.user.userId));
    res.json(friends);
  }),
);

router.post(
  '/me/friends/:friendId',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.params.friendId === req.user.userId) {
      throw httpError(400, 'cannot friend yourself');
    }
    const friends = await updateJsonFile(friendsKey(req.user.userId), (ids) =>
      ids.includes(req.params.friendId) ? ids : [...ids, req.params.friendId],
    );
    res.json(friends);
  }),
);

router.delete(
  '/me/friends/:friendId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const friends = await updateJsonFile(friendsKey(req.user.userId), (ids) =>
      ids.filter((id) => id !== req.params.friendId),
    );
    res.json(friends);
  }),
);

export default router;
