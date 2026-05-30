const APIFY_BASE = 'https://api.apify.com/v2';
const REDDIT_ACTOR = 'trudax~reddit-scraper';
const INSTAGRAM_ACTOR = 'apify~instagram-scraper';
const GOOGLE_MAPS_ACTOR = 'compass~crawler-google-places';

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

function toTikTokItem(raw) {
  const loc = raw.locationMeta ?? {};
  return {
    locationName: (loc.locationName ?? '').trim(),
    address: (loc.address ?? '').trim(),
    city: (loc.city ?? '').trim(),
    playCount: raw.playCount ?? 0,
    diggCount: raw.diggCount ?? 0,
    shareCount: raw.shareCount ?? 0,
    text: (raw.text ?? '').trim(),
    videoUrl: raw.webVideoUrl ?? null,
    hashtag: raw.searchHashtag?.name ?? null,
  };
}

export async function fetchTikTokSpotsByHashtags({ hashtags, maxItems }) {
  const actor = process.env.APIFY_TIKTOK_ACTOR ?? 'clockworks~free-tiktok-scraper';
  const token = requireToken();
  // timeout=120 gives the scraper enough runway; resultsPerPage controls per-hashtag yield
  const url = `${APIFY_BASE}/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=120`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashtags, maxItems, resultsPerPage: maxItems }),
  });
  if (!response.ok) {
    throw new Error(`Apify ${actor} failed: ${response.status} ${await response.text()}`);
  }
  const items = await response.json();
  return items.map(toTikTokItem);
}

export async function findOnGoogleMaps(query) {
  const items = await runActor(GOOGLE_MAPS_ACTOR, {
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: 1,
    language: 'en',
    countryCode: 'us',
  });
  const top = items[0];
  if (!top?.location?.lat || !top?.location?.lng) return null;
  return {
    lat: top.location.lat,
    lng: top.location.lng,
    address: top.address ?? top.title,
    name: top.title,
    category: top.categoryName ?? null,
    relevance: 1,
  };
}
