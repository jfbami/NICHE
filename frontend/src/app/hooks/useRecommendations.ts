import { useMemo } from "react";
import { Location } from "../types/location";

const TAG_WEIGHT = 0.7;
const POPULARITY_WEIGHT = 0.3;
const BADGE_COUNT = 3;

type TasteProfile = Map<string, number>;

function maxOf(values: number[], floor: number): number {
  return values.reduce((max, value) => (value > max ? value : max), floor);
}

function buildTasteProfile(favorites: Location[]): TasteProfile {
  const profile: TasteProfile = new Map();
  for (const location of favorites) {
    for (const tag of location.tags) {
      profile.set(tag, (profile.get(tag) ?? 0) + 1);
    }
  }
  return profile;
}

function scoreTags(tags: string[], profile: TasteProfile): number {
  return tags.reduce((sum, tag) => sum + (profile.get(tag) ?? 0), 0);
}

function rankByTaste(pool: Location[], profile: TasteProfile): Location[] {
  const tagScores = pool.map((location) => scoreTags(location.tags, profile));
  const maxTagScore = maxOf(tagScores, 1);
  const maxSaves = maxOf(pool.map((location) => location.saveCount ?? 0), 1);

  return pool
    .map((location, index) => ({
      location,
      score:
        TAG_WEIGHT * (tagScores[index] / maxTagScore) +
        POPULARITY_WEIGHT * ((location.saveCount ?? 0) / maxSaves),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ location }, rank) => ({ ...location, isRecommended: rank < BADGE_COUNT }));
}

export function useRecommendations(
  locations: Location[],
  favoriteIds: string[],
): Location[] {
  return useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    const visible = locations.filter((location) => location.visibility !== "private");
    const favorites = visible.filter((location) => favoriteSet.has(location.id));
    const pool = visible.filter((location) => !favoriteSet.has(location.id));
    return rankByTaste(pool, buildTasteProfile(favorites));
  }, [locations, favoriteIds]);
}
