import { Router } from 'express';
import { asyncHandler, httpError } from '../utils/http.js';

const router = Router();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
// Bias results toward the Seattle / Puget Sound area.
const SEATTLE_VIEWBOX = '-122.6,47.9,-121.9,47.3';

function toSuggestion(raw) {
  return {
    address: raw.display_name,
    lat: Number(raw.lat),
    lng: Number(raw.lon),
  };
}

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = (req.query.q ?? '').toString().trim();
    if (query.length < 3) {
      res.json([]);
      return;
    }

    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '0',
      limit: '5',
      countrycodes: 'us',
      viewbox: SEATTLE_VIEWBOX,
      bounded: '0',
    });

    const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': 'NeeshApp/1.0 (spot geocoding)' },
    });
    if (!response.ok) {
      throw httpError(502, 'geocoding service unavailable');
    }

    const data = await response.json();
    res.json(data.map(toSuggestion));
  }),
);

export default router;
