import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { updateJsonFile, readJsonFile, createUserFolder } from '../lib/box.js';
import { newUserId } from '../utils/ids.js';
import { httpError, asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, process.env.NEESH_JWT_SECRET, {
    expiresIn: '7d',
  });
}

function toPublicUser(user) {
  return { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw httpError(400, 'username, email, and password are required');
    }
    const user = {
      id: newUserId(),
      username,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString(),
    };
    await updateJsonFile('users.json', (users) => {
      if (users.some((existing) => existing.email === user.email)) {
        throw httpError(409, 'email already registered');
      }
      if (users.some((existing) => existing.username === user.username)) {
        throw httpError(409, 'username already taken');
      }
      return [...users, user];
    });
    await createUserFolder(user.id);
    res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw httpError(400, 'email and password are required');
    }
    const users = await readJsonFile('users.json');
    const user = users.find((candidate) => candidate.email === email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw httpError(401, 'invalid email or password');
    }
    res.json({ token: signToken(user), user: toPublicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await readJsonFile('users.json');
    const user = users.find((candidate) => candidate.id === req.user.userId);
    if (!user) throw httpError(404, 'user not found');
    res.json({ user: toPublicUser(user) });
  }),
);

export default router;
