import jwt from 'jsonwebtoken';
import { httpError } from '../utils/http.js';

function readToken(req) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next(httpError(401, 'Authentication required'));
  try {
    req.user = jwt.verify(token, process.env.NEESH_JWT_SECRET);
    next();
  } catch {
    next(httpError(401, 'Invalid or expired token'));
  }
}

export function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.NEESH_JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }
  next();
}
