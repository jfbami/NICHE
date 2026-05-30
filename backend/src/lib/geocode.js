const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export async function geocode(text) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const url = `${MAPBOX_BASE}/${encodeURIComponent(text)}.json?limit=1&access_token=${token}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature?.center) return null;

  const [lng, lat] = feature.center;
  return { lat, lng };
}
