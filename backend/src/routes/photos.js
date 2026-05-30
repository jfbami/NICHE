import { Router } from 'express';
import multer from 'multer';
import { uploadPhoto } from '../lib/box.js';
import { newPhotoId } from '../utils/ids.js';
import { httpError, asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(httpError(400, 'only image uploads are allowed'));
  },
});

function extensionFor(mimetype) {
  const subtype = mimetype.split('/')[1] || 'jpg';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

router.post(
  '/',
  requireAuth,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(400, 'photo file is required');
    const photoId = newPhotoId();
    const extension = extensionFor(req.file.mimetype);
    const { boxFileId, url } = await uploadPhoto(photoId, req.file.buffer, extension);
    res.status(201).json({ photoId, boxFileId, url });
  }),
);

export default router;
