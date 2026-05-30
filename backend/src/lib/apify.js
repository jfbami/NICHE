const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR = 'trudax~reddit-scraper';

function requireToken() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not set');
  return token;
}

function toPost(raw) {
  if (!raw?.title) return null;
  return {
    title: raw.title,
    body: raw.body ?? raw.text ?? '',
    url: raw.url ?? raw.permalink ?? null,
    subreddit: raw.subreddit ?? null,
  };
}

export async function fetchRedditPosts({ query, limit }) {
  const url = `${APIFY_BASE}/acts/${ACTOR}/run-sync-get-dataset-items?token=${requireToken()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searches: [query],
      type: 'posts',
      maxItems: limit,
      sort: 'top',
    }),
  });
  if (!response.ok) {
    throw new Error(`Apify request failed: ${response.status} ${await response.text()}`);
  }
  const items = await response.json();
  return items.map(toPost).filter(Boolean);
}
