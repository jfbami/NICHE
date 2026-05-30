import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

const SYSTEM_PROMPT = `You analyze TikTok videos tagged at a specific physical location and decide whether it is a niche, locally-discovered gem worth pinning on a map of Seattle / PNW hidden spots. Output via the record_spot tool only.

A niche gem MUST be:
- A specific named venue (restaurant, cafe, bar, viewpoint, trail, shop, park, attraction) with a fixed address
- Worth visiting because it is interesting, local, or off the beaten path
- Not a mass-market tourist attraction already on every travel list

REJECT (set isNicheGem=false) if ANY of these apply:
- The location is a world-famous landmark (Space Needle, Pike Place Market, Snoqualmie Falls, etc.)
- The location is a major chain, franchise, or national brand
- The location is a neighborhood, city name, street name, or region — not a specific venue
- The video is clearly sponsored or self-promotional for the venue itself
- The location is a major sports stadium, convention center, or airport

ACCEPT (set isNicheGem=true) when the location is a specific spot that locals love but visitors might not know — hidden viewpoints, independent restaurants, quirky landmarks, beautiful parks, unique experiences. Locally iconic spots count (Kerry Park, Fremont Troll) even if somewhat known, as long as they are not universally famous tourist traps.

When accepting, write:
- placeName: the venue's actual public-facing name, exactly as a local would say it
- blurb: a single warm, conversational sentence (max 25 words) describing what makes this spot worth visiting. Write like a friend who has been there. No hashtags, no emoji-only sentences, no promotional language.
- neighborhood: the neighborhood or city district (e.g. "Capitol Hill", "Ballard", "Fremont", "Bainbridge Island")
- category: one of restaurant, cafe, bar, viewpoint, park, shop, trail, other
- confidence: high, medium, or low

If unsure, prefer isNicheGem=false. A missed pin is fine; a wrong or generic pin hurts the app.`;

const SPOT_TOOL = {
  name: 'record_spot',
  description: 'Record the venue identified in the TikTok video.',
  input_schema: {
    type: 'object',
    properties: {
      placeName: {
        type: ['string', 'null'],
        description: 'Exact public-facing venue name. Null if no specific venue can be identified.',
      },
      blurb: {
        type: ['string', 'null'],
        description: 'One warm conversational sentence about the spot, max 25 words. No hashtags or emoji.',
      },
      neighborhood: {
        type: ['string', 'null'],
        description: 'Neighborhood or district, e.g. "Capitol Hill", "Ballard", "Gold Bar".',
      },
      category: {
        type: ['string', 'null'],
        enum: ['restaurant', 'cafe', 'bar', 'viewpoint', 'park', 'shop', 'trail', 'other', null],
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
      },
      isNicheGem: {
        type: 'boolean',
        description: 'Whether this is a niche, locally-discovered gem — not a tourist trap, chain, or generic location.',
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

function buildUserMessage(item) {
  return [
    `Location name (from TikTok tag): ${item.locationName}`,
    `Address: ${item.address}`,
    `City: ${item.city || 'unknown'}`,
    `Engagement: ${item.playCount.toLocaleString()} plays, ${item.diggCount.toLocaleString()} likes, ${item.shareCount.toLocaleString()} shares`,
    '',
    'Video caption:',
    item.text || '(no caption)',
  ].join('\n');
}

function findToolInput(content) {
  const block = content.find((b) => b.type === 'tool_use' && b.name === 'record_spot');
  return block?.input ?? null;
}

export async function extractSpotFromTikTok(item) {
  const model = process.env.BEDROCK_MODEL_ID;
  if (!model) throw new Error('BEDROCK_MODEL_ID is not set');

  const response = await getClient().messages.create({
    model,
    max_tokens: 400,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [SPOT_TOOL],
    tool_choice: { type: 'tool', name: 'record_spot' },
    messages: [{ role: 'user', content: buildUserMessage(item) }],
  });

  return findToolInput(response.content);
}
