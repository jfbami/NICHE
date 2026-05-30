import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';

const SYSTEM_PROMPT = `You verify whether a geocoder result actually refers to the same venue described in an Instagram post. Output via the verify_match tool only.

Return matches=true ONLY if you are confident the candidate address is the SAME real-world venue as the one described. Reject if:
- The candidate is in a completely different neighborhood than the post claims
- The candidate is a generic street, intersection, or city centroid (not a specific business)
- The candidate name is a coincidental match (e.g. a different business with similar words)
- The candidate is hundreds of miles from where the post implies

When in doubt, return matches=false. A missed pin is fine; a wrong pin destroys user trust.`;

const VERIFY_TOOL = {
  name: 'verify_match',
  description: 'Decide whether the geocoded candidate matches the venue described in the post.',
  input_schema: {
    type: 'object',
    properties: {
      matches: {
        type: 'boolean',
        description: 'True only if the candidate address clearly refers to the same venue as the post.',
      },
      reason: {
        type: 'string',
        description: 'Brief one-sentence explanation for the decision.',
      },
    },
    required: ['matches', 'reason'],
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

function buildUserMessage({ extracted, candidate }) {
  return [
    'POST claims:',
    `  Place name: ${extracted.placeName}`,
    `  Neighborhood: ${extracted.neighborhood ?? 'unknown'}`,
    `  Category: ${extracted.category ?? 'unknown'}`,
    `  Blurb: ${extracted.blurb ?? 'none'}`,
    '',
    'GEOCODER returned:',
    `  Address: ${candidate.address}`,
    `  Coordinates: ${candidate.lat}, ${candidate.lng}`,
    `  Mapbox relevance: ${candidate.relevance}`,
    '',
    'Is this the same venue?',
  ].join('\n');
}

function findToolInput(content) {
  const block = content.find((b) => b.type === 'tool_use' && b.name === 'verify_match');
  return block?.input ?? null;
}

export async function verifyGeocodedSpot({ extracted, candidate }) {
  const model = process.env.BEDROCK_MODEL_ID;
  if (!model) throw new Error('BEDROCK_MODEL_ID is not set');

  const response = await getClient().messages.create({
    model,
    max_tokens: 200,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [VERIFY_TOOL],
    tool_choice: { type: 'tool', name: 'verify_match' },
    messages: [{ role: 'user', content: buildUserMessage({ extracted, candidate }) }],
  });

  return findToolInput(response.content);
}
