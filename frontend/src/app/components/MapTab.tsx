import { useEffect, useRef, useState } from "react";
import { Location } from "../types/location";

type VisibilityFilter = "public" | "friends" | "private";

interface MapTabProps {
  locations: Location[];
  favoriteIds: string[];
  onViewDetails: (location: Location) => void;
  onToggleFavorite: (id: string) => void;
  placementMode?: boolean;
  onPlacementConfirm?: (lat: number, lng: number) => void;
  onPlacementCancel?: () => void;
  flyToTarget?: { lat: number; lng: number; id: string } | null;
  onFlyToComplete?: () => void;
}

interface PopupInfo {
  location: Location;
  x: number;
  y: number;
}

const RADIUS_OPTIONS = [1, 5, 10, 25, 50] as const;

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEESH_STYLE = {
  version: 8 as const,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: {
      type: "vector" as const,
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    { id: "background", type: "background" as const, paint: { "background-color": "#faf7f4" } },
    {
      id: "water",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#a0856b", "fill-opacity": 0.7 },
    },
    {
      id: "landuse-park",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", "class", "park", "forest", "grass", "meadow", "garden", "recreation_ground", "nature_reserve"],
      paint: { "fill-color": "#E8C49A", "fill-opacity": 0.6 },
    },
    {
      id: "landcover-grass",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", "class", "grass", "scrub", "wood", "farmland"],
      paint: { "fill-color": "#E8C49A", "fill-opacity": 0.45 },
    },
    {
      id: "landuse-residential",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["==", "class", "residential"],
      paint: { "fill-color": "#f2ece5", "fill-opacity": 0.8 },
    },
    {
      id: "landuse-commercial",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", "class", "commercial", "industrial", "retail"],
      paint: { "fill-color": "#e8ddd4", "fill-opacity": 0.7 },
    },
    {
      id: "building",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "building",
      paint: { "fill-color": "#d4bfa8", "fill-opacity": 0.8 },
    },
    {
      id: "building-outline",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "building",
      paint: { "line-color": "#c4a882", "line-width": 0.5 },
    },
    {
      id: "road-minor",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "minor", "service", "track"],
      paint: { "line-color": "#ffffff", "line-width": 1 },
    },
    {
      id: "road-secondary",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "secondary", "tertiary"],
      paint: { "line-color": "#ffffff", "line-width": 2 },
    },
    {
      id: "road-primary",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["in", "class", "primary", "trunk"],
      paint: { "line-color": "#ffffff", "line-width": 3 },
    },
    {
      id: "road-motorway",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", "class", "motorway"],
      paint: { "line-color": "#ede3d8", "line-width": 4 },
    },
    {
      id: "road-label",
      type: "symbol" as const,
      source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 14,
      layout: {
        "symbol-placement": "line" as const,
        "text-field": ["get", "name"] as any,
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-letter-spacing": 0.04,
        "text-max-angle": 30,
        "text-padding": 2,
      },
      paint: {
        "text-color": "#5a4632",
        "text-halo-color": "#faf7f4",
        "text-halo-width": 1.4,
        "text-halo-blur": 0.5,
      },
    },
  ],
};

export function MapTab({ locations, favoriteIds, onViewDetails, onToggleFavorite, placementMode, onPlacementConfirm, onPlacementCancel, flyToTarget, onFlyToComplete }: MapTabProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const locationsRef = useRef(locations);
  const setPopupRef = useRef<any>(null);
  const userLocationRef = useRef<[number, number] | null>(null);
  const flyToTargetRef = useRef(flyToTarget);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<VisibilityFilter>>(new Set(["public", "friends", "private"]));
  const [radiusMiles, setRadiusMiles] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  setPopupRef.current = setPopup;
  flyToTargetRef.current = flyToTarget;

  const filteredLocations = locations.filter((loc) => {
    if (!activeFilters.has(loc.visibility ?? "public")) return false;
    if (radiusMiles != null && userLocation) {
      const [lng, lat] = userLocation;
      if (milesBetween(lat, lng, loc.latitude, loc.longitude) > radiusMiles) return false;
    }
    return true;
  });
  locationsRef.current = filteredLocations;

  const toggleFilter = (v: VisibilityFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(v)) { if (next.size > 1) next.delete(v); }
      else next.add(v);
      return next;
    });
  };

  const onFlyToCompleteRef = useRef(onFlyToComplete);
  onFlyToCompleteRef.current = onFlyToComplete;

  const executeFlyTo = (target: { lat: number; lng: number; id: string }) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [target.lng, target.lat], zoom: 16 });
    onFlyToCompleteRef.current?.();
    setTimeout(() => {
      const loc = locationsRef.current.find((l) => l.id === target.id);
      if (loc && mapRef.current) {
        const point = mapRef.current.project([loc.longitude, loc.latitude]);
        setPopupRef.current({ location: loc, x: point.x, y: point.y });
      }
    }, 900);
  };

  const addMarkers = (maplibre: any, map: any) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locationsRef.current.forEach((loc) => {
      const hasImage = Boolean(loc.imageUrl);

      const cardW  = hasImage ? 36 : 28;
      const cardH  = hasImage ? 50 : 40;
      const tailW  = hasImage ? 9  : 7;
      const tailH  = hasImage ? 14 : 11;

      const el = document.createElement("div");
      el.style.cssText = `width:${cardW}px;height:${cardH + tailH + 1}px;cursor:pointer;`;
      el.innerHTML = `
        <div style="position:relative;width:${cardW}px;height:${cardH}px;border-radius:7px;border:2px solid #2C1A0E;box-shadow:0 2px 6px rgba(0,0,0,0.3);background-color:#E8C49A;${hasImage ? `background-image:url('${loc.imageUrl}');background-size:cover;background-position:center;` : ''}overflow:hidden;">
          ${!hasImage ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',Georgia,serif;font-weight:800;font-size:19px;color:#2C1A0E;letter-spacing:0.03em;user-select:none;">n</span>` : ''}
        </div>
        <div style="width:0;height:0;border-left:${tailW}px solid transparent;border-right:${tailW}px solid transparent;border-top:${tailH}px solid #2C1A0E;margin:0 auto;margin-top:-1px;"></div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const point = map.project([loc.longitude, loc.latitude]);
        setPopupRef.current({ location: loc, x: point.x, y: point.y });
      });

      const marker = new maplibre.Marker({ element: el, anchor: "bottom" })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!document.getElementById("maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    import("maplibre-gl").then((maplibre) => {
      const map = new maplibre.Map({
        container: mapContainerRef.current!,
        style: NEESH_STYLE as any,
        center: [-122.3321, 47.6062],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibre.NavigationControl(), "top-right");

      map.on("load", () => {
        mapRef.current = map;
        addMarkers(maplibre, map);

        if (flyToTargetRef.current) {
          executeFlyTo(flyToTargetRef.current);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userLocationRef.current = [pos.coords.longitude, pos.coords.latitude];
              setUserLocation([pos.coords.longitude, pos.coords.latitude]);
              map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
              const el = document.createElement("div");
              el.style.cssText = "width:20px;height:20px;position:relative;";
              el.innerHTML = `
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(201,181,227,0.4);animation:pulse 2s ease-out infinite;"></div>
                <div style="position:absolute;inset:3px;border-radius:50%;background:#2C1A0E;border:2px solid #fff;box-shadow:0 0 0 2px #2C1A0E;"></div>
              `;
              new maplibre.Marker({ element: el, anchor: "center" })
                .setLngLat([pos.coords.longitude, pos.coords.latitude])
                .addTo(map);
            },
            () => {}
          );
        }
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("maplibre-gl").then((maplibre) => {
      addMarkers(maplibre, mapRef.current);
    });
  }, [locations, activeFilters, radiusMiles, userLocation]);

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    executeFlyTo(flyToTarget);
  }, [flyToTarget]);

  return (
    <div className="relative w-full h-full" onClick={() => { setPopup(null); setFilterOpen(false); }}>
      <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

      {popup && (
        <div
          className="absolute z-50 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{
            left: Math.max(8, Math.min(popup.x - 128, window.innerWidth - 272)),
            top: Math.max(8, popup.y - 230),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {popup.location.imageUrl && (
            <img
              src={popup.location.imageUrl}
              alt={popup.location.name}
              className="w-full h-28 object-cover"
            />
          )}
          <div className="p-3">
            <div className="mb-1">
              <h3 className="font-semibold text-sm leading-tight" style={{ color: "#2C1A0E" }}>
                {popup.location.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {popup.location.description}
            </p>
            <div className="flex gap-1 flex-wrap mb-3">
              {popup.location.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(201,181,227,0.35)", color: "#2C1A0E" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onViewDetails(popup.location); setPopup(null); }}
                className="flex-1 text-white text-xs py-2 rounded-xl transition-colors"
                style={{ background: "#2C1A0E" }}
              >
                View Details
              </button>
              <button
                onClick={() => onToggleFavorite(popup.location.id)}
                className="flex items-center justify-center rounded-xl transition-colors"
                style={{
                  width: "33%",
                  background: favoriteIds.includes(popup.location.id) ? "#2C1A0E" : "rgba(201,181,227,0.25)",
                  border: "1.5px solid #2C1A0E",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={favoriteIds.includes(popup.location.id) ? "white" : "none"} stroke={favoriteIds.includes(popup.location.id) ? "white" : "#2C1A0E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter cog */}
      {!placementMode && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setFilterOpen((o) => !o); }}
            className="bg-white rounded-full p-2.5 shadow-lg flex items-center justify-center"
            style={{ border: "1.5px solid #2C1A0E" }}
            title="Filter locations"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          {filterOpen && (
            <div
              className="absolute top-12 left-0 bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: 200, border: "1.5px solid rgba(201,181,227,0.6)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(201,181,227,0.4)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2C1A0E" }}>Show on map</p>
              </div>
              {([
                { key: "public" as const, label: "Public spots", icon: "🌍" },
                { key: "friends" as const, label: "Friends only", icon: "👥" },
                { key: "private" as const, label: "Personal spots", icon: "🔒" },
              ]).map(({ key, label, icon }) => {
                const active = activeFilters.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span style={{ fontSize: "1rem" }}>{icon}</span>
                      <span className="text-sm" style={{ color: "#2C1A0E" }}>{label}</span>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: active ? "#2C1A0E" : "#E8C49A",
                        background: active ? "#2C1A0E" : "transparent",
                      }}
                    >
                      {active && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="px-4 py-3 border-t border-b" style={{ borderColor: "rgba(201,181,227,0.4)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2C1A0E" }}>Distance</p>
                {!userLocation && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Enable location to filter by distance</p>
                )}
              </div>
              <button
                onClick={() => setRadiusMiles(null)}
                className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50"
              >
                <span className="text-sm" style={{ color: "#2C1A0E" }}>Any distance</span>
                {radiusMiles === null && (
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#2C1A0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              {RADIUS_OPTIONS.map((miles) => {
                const selected = radiusMiles === miles;
                return (
                  <button
                    key={miles}
                    onClick={() => setRadiusMiles(miles)}
                    disabled={!userLocation}
                    className="w-full flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50 disabled:opacity-40"
                  >
                    <span className="text-sm" style={{ color: "#2C1A0E" }}>Within {miles} {miles === 1 ? "mile" : "miles"}</span>
                    {selected && (
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#2C1A0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!placementMode && (
        <button
          onClick={() => {
            if (userLocationRef.current && mapRef.current) {
              mapRef.current.flyTo({ center: userLocationRef.current, zoom: 15 });
            } else if (mapRef.current) {
              navigator.geolocation?.getCurrentPosition((pos) => {
                userLocationRef.current = [pos.coords.longitude, pos.coords.latitude];
                setUserLocation([pos.coords.longitude, pos.coords.latitude]);
                mapRef.current.flyTo({ center: userLocationRef.current, zoom: 15 });
              });
            }
          }}
          className="absolute bottom-4 left-4 z-10 bg-white rounded-full p-2.5 shadow-lg"
          style={{ border: "1.5px solid #2C1A0E" }}
          title="Go to my location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
            <circle cx="12" cy="12" r="8" strokeDasharray="2 4"/>
          </svg>
        </button>
      )}

      {placementMode && (
        <>
          {/* Crosshair pin at center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{ paddingBottom: 54 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 36, height: 50, borderRadius: 7, border: "2px solid #2C1A0E", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", background: "#E8C49A" }} />
              <div style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "14px solid #2C1A0E", marginTop: -1 }} />
            </div>
          </div>

          {/* X and check buttons */}
          <div className="absolute z-20 flex gap-3" style={{ bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
            <button
              onClick={onPlacementCancel}
              className="bg-white rounded-xl px-5 py-2.5 shadow-lg flex items-center justify-center"
              style={{ border: "1.5px solid #2C1A0E" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C1A0E" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <button
              onClick={() => {
                if (mapRef.current && onPlacementConfirm) {
                  const center = mapRef.current.getCenter();
                  onPlacementConfirm(center.lat, center.lng);
                }
              }}
              className="rounded-xl px-5 py-2.5 shadow-lg flex items-center justify-center"
              style={{ background: "#2C1A0E" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
