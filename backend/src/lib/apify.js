const APIFY_BASE = 'https://api.apify.com/v2';
const REDDIT_ACTOR = 'trudax~reddit-scraper';
const INSTAGRAM_ACTOR = 'apify~instagram-scraper';

function requireToken() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is not set');
  return token;
}

async function runActor(actor, input) {
  const url = `${APIFY_BASE}/acts/${actor}/run-sync-get-dataset-items?token=${requireToken()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Apify ${actor} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function toRedditPost(raw) {
  if (!raw?.title) return null;
  return {
    title: raw.title,
    body: raw.body ?? raw.text ?? '',
    url: raw.url ?? raw.permalink ?? null,
    subreddit: raw.subreddit ?? null,
  };
}

function hashtagUrl(tag) {
  const clean = tag.replace(/^#/, '');
  return `https://www.instagram.com/explore/tags/${clean}/`;
}

function toInstagramPost(raw) {
  if (!raw?.shortCode) return null;
  return {
    postId: raw.id,
    postUrl: raw.url ?? `https://www.instagram.com/p/${raw.shortCode}/`,
    caption: raw.caption ?? '',
    hashtags: raw.hashtags ?? [],
    displayUrl: raw.displayUrl ?? null,
    ownerUsername: raw.ownerUsername ?? null,
    ownerFullName: raw.ownerFullName ?? null,
    locationName: raw.locationName ?? null,
    locationId: raw.locationId ?? null,
    timestamp: raw.timestamp ?? null,
  };
}

export async function fetchRedditPosts({ query, limit }) {
  const items = await runActor(REDDIT_ACTOR, {
    searches: [query],
    type: 'posts',
    maxItems: limit,
    sort: 'top',
  });
  return items.map(toRedditPost).filter(Boolean);
}

export async function fetchInstagramPostsByHashtags({ hashtags, resultsPerHashtag }) {
  const items = await runActor(INSTAGRAM_ACTOR, {
    directUrls: hashtags.map(hashtagUrl),
    resultsType: 'posts',
    resultsLimit: resultsPerHashtag,
    addParentData: false,
  });
  return items.map(toInstagramPost).filter(Boolean);
}
