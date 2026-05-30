import { findOnGoogleMaps } from './apify.js';

const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const SEATTLE_PROXIMITY = '-122.3321,47.6062';
const PNW_BBOX = '-123.4,46.8,-121.5,48.5';
const MIN_RELEVANCE = 0.5;
const GENERIC_PLACE_TYPES = new Set(['region', 'place', 'neighborhood', 'locality', 'district']);

function isSpecific(feature) {
  const types = feature.place_type ?? [];
  return !types.every((type) => GENERIC_PLACE_TYPES.has(type));
}

async function geocodeWithMapbox(text) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const params = new URLSearchParams({
    limit: '5',
    proximity: SEATTLE_PROXIMITY,
    bbox: PNW_BBOX,
    access_token: token,
  });
  const url = `${MAPBOX_BASE}/${encodeURIComponent(text)}.json?${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const feature = (data.features ?? []).find(
    (f) => f.center && f.relevance >= MIN_RELEVANCE && isSpecific(f),
  );
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { lat, lng, address: feature.place_name, relevance: feature.relevance };
}

export async function geocode(text) {
  try {
    const google = await findOnGoogleMaps(text);
    if (google) return google;
  } catch {
    // fall through to Mapbox
  }
  return geocodeWithMapbox(text);
}
