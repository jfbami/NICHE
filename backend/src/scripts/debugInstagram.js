import 'dotenv/config';
import { fetchInstagramPostsByHashtags } from '../lib/apify.js';
import { extractSpotFromPost } from '../lib/extractor.js';
import { geocode } from '../lib/geocode.js';
import { verifyGeocodedSpot } from '../lib/verifier.js';

const posts = await fetchInstagramPostsByHashtags({
  hashtags: ['seattlefoodie', 'pnwfoodie', 'seattlefood'],
  resultsPerHashtag: 8,
});

console.log(`\nFetched ${posts.length} posts from Apify\n`);

for (const [i, post] of posts.entries()) {
  console.log(`──────── Post ${i + 1}/${posts.length} ────────`);
  console.log(`Owner: @${post.ownerUsername} (${post.ownerFullName ?? 'no full name'})`);
  console.log(`Caption preview: ${(post.caption ?? '').slice(0, 120).replace(/\n/g, ' ')}…`);

  const extracted = await extractSpotFromPost(post);
  console.log('Extracted:', JSON.stringify(extracted, null, 2));

  if (!extracted?.isNicheGem || !extracted.searchQuery || extracted.confidence === 'low') {
    console.log('→ DROPPED at extraction\n');
    continue;
  }

  const candidate = await geocode(extracted.searchQuery);
  console.log('Geocoded:', candidate);

  if (!candidate) {
    console.log('→ DROPPED at geocoding (no match or relevance too low)\n');
    continue;
  }

  const verdict = await verifyGeocodedSpot({ extracted, candidate });
  console.log('Verifier:', verdict);

  if (!verdict?.matches) {
    console.log('→ DROPPED by verifier\n');
    continue;
  }

  console.log('→ ✅ PASSED ALL CHECKS\n');
}
