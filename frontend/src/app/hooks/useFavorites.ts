import { useCallback, useEffect, useState } from "react";
import { fetchSavedSpots, saveSpot, unsaveSpot } from "../lib/api";

export interface FavoritesState {
  favoriteIds: string[];
  loading: boolean;
  toggle: (spotId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useFavorites(enabled: boolean): FavoritesState {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const saved = await fetchSavedSpots();
      setFavoriteIds(saved.map((entry) => entry.id));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggle = useCallback(
    async (spotId: string) => {
      const isFavorited = favoriteIds.includes(spotId);
      setFavoriteIds((prev) =>
        isFavorited ? prev.filter((id) => id !== spotId) : [...prev, spotId],
      );
      try {
        const result = isFavorited ? await unsaveSpot(spotId) : await saveSpot(spotId);
        setFavoriteIds(result.saved);
      } catch {
        setFavoriteIds((prev) =>
          isFavorited ? [...prev, spotId] : prev.filter((id) => id !== spotId),
        );
      }
    },
    [favoriteIds],
  );

  return { favoriteIds, loading, toggle, reload };
}
