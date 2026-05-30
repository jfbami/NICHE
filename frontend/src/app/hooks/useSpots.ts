import { useCallback, useEffect, useState } from "react";
import { fetchSpotsInBounds } from "../lib/api";
import { spotToLocation } from "../lib/spotAdapter";
import { Location } from "../types/location";

export interface SpotsState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addLocal: (location: Location) => void;
}

export function useSpots(): SpotsState {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await fetchSpotsInBounds();
      setLocations(entries.map(spotToLocation));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addLocal = useCallback((location: Location) => {
    setLocations((prev) => [location, ...prev]);
  }, []);

  return { locations, loading, error, reload, addLocal };
}
