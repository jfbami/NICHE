import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

const SYSTEM_PROMPT = `You read Instagram posts and identify the specific physical venue or location the post is about. Output via the record_spot tool only.

Mark isNicheGem=false for:
- Chain restaurants, franchises
- Sponsored or promotional posts from a business about itself
- Generic cityscape, sunrise, or skyline shots with no venue

Mark isNicheGem=true for:
- Small independent restaurants, food carts, coffee shops
- Hidden viewpoints, trails, swimming holes
- Tucked-away bars, bookstores, record shops
- Locations described by a poster as a "find" or "gem"

If you cannot identify a specific named place, set placeName to null.`;

const SPOT_TOOL = {
  name: 'record_spot',
  description: 'Record the venue or location identified in the post.',
  input_schema: {
    type: 'object',
    properties: {
      placeName: {
        type: ['string', 'null'],
        description: 'Specific venue name, e.g. "Gyro Hut" or "Kerry Park". Null if unidentifiable.',
      },
      addressHint: {
        type: ['string', 'null'],
        description: 'Street address if present in the caption, otherwise null.',
      },
      neighborhood: {
        type: ['string', 'null'],
        description: 'Neighborhood or district, e.g. "Capitol Hill", "Ballard".',
      },
      category: {
        type: ['string', 'null'],
        description: 'One of: restaurant, cafe, bar, viewpoint, park, shop, trail, other.',
      },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence the placeName refers to a specific real venue.',
      },
      isNicheGem: {
        type: 'boolean',
        description: 'Whether the post represents a niche local gem vs. self-promo or chain content.',
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
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [SPOT_TOOL],
    tool_choice: { type: 'tool', name: 'record_spot' },
    messages: [{ role: 'user', content: buildUserMessage(post) }],
  });

  return findToolInput(response.content);
}
