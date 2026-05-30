const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const SEATTLE_PROXIMITY = '-122.3321,47.6062';
const PNW_BBOX = '-123.4,46.8,-121.5,48.5';

export async function geocode(text) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const params = new URLSearchParams({
    limit: '1',
    proximity: SEATTLE_PROXIMITY,
    bbox: PNW_BBOX,
    access_token: token,
  });
  const url = `${MAPBOX_BASE}/${encodeURIComponent(text)}.json?${params}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature?.center) return null;

  const [lng, lat] = feature.center;
  return { lat, lng };
}
