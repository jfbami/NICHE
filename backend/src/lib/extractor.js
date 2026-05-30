import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

const SYSTEM_PROMPT = `You read Instagram posts and decide whether they reference a real, specific, niche physical venue worth pinning on a map of "hidden gems" in the Seattle / PNW area. Output via the record_spot tool only.

A niche gem MUST be:
- A specific named venue (restaurant, cafe, bar, viewpoint, trail, shop, park) — not a person, not a generic city, not a neighborhood, not an event
- Identifiable by name and locatable on a map
- Discovered or recommended, not advertised

REJECT (set isNicheGem=false) if ANY of these apply:
- The owner's username or full name is the venue itself (self-promotion). Example: ownerUsername "gyrohutrestaurant" posting about Gyro Hut → REJECT.
- The caption contains promotional CTAs ("DM us", "book now", "order online", "follow us", "link in bio")
- It's a chain or franchise (Starbucks, Chipotle, Olive Garden, etc.)
- The "place" is actually a person's name, an event, an Instagram handle, or a brand without a fixed location
- You cannot identify a specific named venue with reasonable certainty
- The post is about a city, neighborhood, or region in general rather than a specific spot within it

ACCEPT (set isNicheGem=true) when the post recommends or showcases a small, specific, locally-loved place. Both personal users AND food/travel bloggers count — what matters is that the post is ABOUT the place (sharing, exploring, recommending), not advertising the poster's own business. Small independent spots count even if they're somewhat well-known among locals.

When accepting, you also write:
- placeName: the venue's actual public-facing name, exactly as a local would say it
- searchQuery: an optimized Google/Mapbox search query that uniquely identifies this place. Format: "{venue name} {neighborhood or street} Seattle WA" (or Edmonds, Bellevue, etc. if outside Seattle). Be specific enough that there is only ONE result.
- blurb: a single warm, conversational sentence (max 25 words) describing what makes this spot worth visiting. Write like a friend who's been there. NO hashtags, NO emoji-only sentences, NO promotional language. Example: "A cozy Capitol Hill bar with a covered patio and 3-6 PM holy hour cocktails."
- neighborhood, category, confidence as usual

If unsure, set confidence to "low" and isNicheGem to false. False positives hurt more than missed positives.`;

const SPOT_TOOL = {
  name: 'record_spot',
  description: 'Record the venue identified in the Instagram post.',
  input_schema: {
    type: 'object',
    properties: {
      placeName: {
        type: ['string', 'null'],
        description: 'Exact public-facing venue name. Null if no specific venue can be identified.',
      },
      searchQuery: {
        type: ['string', 'null'],
        description: 'Geocoder-optimized query that uniquely identifies this venue, e.g. "The Pine Box bar 1600 Melrose Ave Capitol Hill Seattle".',
      },
      blurb: {
        type: ['string', 'null'],
        description: 'One warm conversational sentence about the spot, max 25 words. No hashtags or emoji.',
      },
      neighborhood: {
        type: ['string', 'null'],
        description: 'Neighborhood or district, e.g. "Capitol Hill", "Ballard", "Fremont".',
      },
      category: {
        type: ['string', 'null'],
        enum: ['restaurant', 'cafe', 'bar', 'viewpoint', 'park', 'shop', 'trail', 'other', null],
        description: 'One of the listed categories.',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence the placeName refers to a specific real venue at a specific location.',
      },
      isNicheGem: {
        type: 'boolean',
        description: 'Whether the post represents a niche, locally-discovered gem (not self-promo, chain, or generic content).',
      },
    },
    required: ['placeName', 'confidence', 'isNicheGem'],
  },
};

let client;

function getClient() {
  if (client) return client;
  if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
    throw new Error('AWS_BEARER_TOKEN_BEDROCK is not set');
  }
  client = new AnthropicBedrock({ awsRegion: process.env.AWS_REGION ?? 'us-east-2' });
  return client;
}

function buildUserMessage(post) {
  return [
    `Owner username: ${post.ownerUsername ?? 'unknown'}`,
    `Owner full name: ${post.ownerFullName ?? 'unknown'}`,
    `Location tag: ${post.locationName ?? 'none'}`,
    `Hashtags: ${(post.hashtags ?? []).join(', ') || 'none'}`,
    '',
    'Caption:',
    post.caption ?? '(no caption)',
  ].join('\n');
}

function findToolInput(content) {
  const block = content.find((b) => b.type === 'tool_use' && b.name === 'record_spot');
  return block?.input ?? null;
}

export async function extractSpotFromPost(post) {
  const model = process.env.BEDROCK_MODEL_ID;
  if (!model) throw new Error('BEDROCK_MODEL_ID is not set');

  const response = await getClient().messages.create({
    model,
    max_tokens: 600,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [SPOT_TOOL],
    tool_choice: { type: 'tool', name: 'record_spot' },
    messages: [{ role: 'user', content: buildUserMessage(post) }],
  });

  return findToolInput(response.content);
}
