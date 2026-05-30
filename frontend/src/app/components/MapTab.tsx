import { useEffect, useRef, useState } from "react";
import { Location } from "../types/location";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapTabProps {
  locations: Location[];
  favoriteIds: string[];
  onViewDetails: (location: Location) => void;
  onToggleFavorite: (id: string) => void;
  placementMode?: boolean;
  onPlacementConfirm?: (lat: number, lng: number) => void;
  onPlacementCancel?: () => void;
}

interface PopupInfo {
  location: Location;
  x: number;
  y: number;
}

const NEESH_STYLE = {
  version: 8 as const,
  sources: {
    openmaptiles: {
      type: "vector" as const,
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    // Background
    { id: "background", type: "background" as const, paint: { "background-color": "#f5f1fc" } },

    // Water — medium purple
    {
      id: "water",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#b09dd4", "fill-opacity": 0.7 },
    },

    // Parks & nature — light purple brand color
    {
      id: "landuse-park",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", "class", "park", "forest", "grass", "meadow", "garden", "recreation_ground", "nature_reserve"],
      paint: { "fill-color": "#C9B5E3", "fill-opacity": 0.6 },
    },
    {
      id: "landcover-grass",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", "class", "grass", "scrub", "wood", "farmland"],
      paint: { "fill-color": "#C9B5E3", "fill-opacity": 0.45 },
    },

    // Residential blocks — very light lavender
    {
      id: "landuse-residential",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["==", "class", "residential"],
      paint: { "fill-color": "#ece7f7", "fill-opacity": 0.8 },
    },

    // Commercial / industrial
    {
      id: "landuse-commercial",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", "class", "commercial", "industrial", "retail"],
      paint: { "fill-color": "#ddd5f0", "fill-opacity": 0.7 },
    },

    // Buildings — soft lilac
    {
      id: "building",
      type: "fill" as const,
      source: "openmaptiles",
      "source-layer": "building",
      paint: { "fill-color": "#d4c8eb", "fill-opacity": 0.8 },
    },
    {
      id: "building-outline",
      type: "line" as const,
      source: "openmaptiles",
      "source-layer": "building",
      paint: { "line-color": "#bfb0d9", "line-width": 0.5 },
    },

    // Roads — white/light
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
      paint: { "line-color": "#e8e0f5", "line-width": 4 },
    },

  ],
};

export function MapTab({ locations, favoriteIds, onViewDetails, onToggleFavorite, placementMode, onPlacementConfirm, onPlacementCancel }: MapTabProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const locationsRef = useRef(locations);
  const setPopupRef = useRef<any>(null);
  const userLocationRef = useRef<[number, number] | null>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  setPopupRef.current = setPopup;
  locationsRef.current = locations;

  const addMarkers = (maplibre: any, map: any) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    locationsRef.current.forEach((loc) => {
      const el = document.createElement("div");
      el.style.cssText = "width:40px;height:48px;cursor:pointer;";
      el.innerHTML = `
        <div style="width:40px;height:32px;border-radius:7px;border:2px solid #332D4E;box-shadow:0 2px 6px rgba(0,0,0,0.3);background-color:#C9B5E3;background-image:url('${loc.imageUrl}');background-size:cover;background-position:center;"></div>
        <div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid #332D4E;margin:0 auto;margin-top:-1px;"></div>
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

    import("maplibre-gl").then((maplibre) => {
      const map = new maplibre.Map({
        container: mapContainerRef.current!,
        style: NEESH_STYLE as any,
        center: [-122.3321, 47.6062],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibre.NavigationControl(), "top-right");
      map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        mapRef.current = map;
        addMarkers(maplibre, map);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userLocationRef.current = [pos.coords.longitude, pos.coords.latitude];
              map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
              const el = document.createElement("div");
              el.style.cssText = "width:20px;height:20px;position:relative;";
              el.innerHTML = `
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(201,181,227,0.4);animation:pulse 2s ease-out infinite;"></div>
                <div style="position:absolute;inset:3px;border-radius:50%;background:#332D4E;border:2px solid #fff;box-shadow:0 0 0 2px #332D4E;"></div>
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
  }, [locations]);

  return (
    <div className="relative w-full h-full" onClick={() => setPopup(null)}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

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
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-tight" style={{ color: "#332D4E" }}>
                {popup.location.name}
              </h3>
              <button
                onClick={() => onToggleFavorite(popup.location.id)}
                className="shrink-0 text-lg leading-none"
              >
                {favoriteIds.includes(popup.location.id) ? "❤️" : "🤍"}
              </button>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
              {popup.location.description}
            </p>
            <div className="flex gap-1 flex-wrap mb-3">
              {popup.location.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(201,181,227,0.35)", color: "#332D4E" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => { onViewDetails(popup.location); setPopup(null); }}
              className="w-full text-white text-xs py-2 rounded-xl transition-colors"
              style={{ background: "#332D4E" }}
            >
              View Details
            </button>
          </div>
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
                mapRef.current.flyTo({ center: userLocationRef.current, zoom: 15 });
              });
            }
          }}
          className="absolute bottom-4 left-4 z-10 bg-white rounded-full p-2.5 shadow-lg"
          style={{ border: "1.5px solid #332D4E" }}
          title="Go to my location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#332D4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div style={{ width: 40, height: 32, borderRadius: 7, border: "2px solid #332D4E", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", background: "#C9B5E3" }} />
              <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "12px solid #332D4E", marginTop: -1 }} />
            </div>
          </div>

          {/* X and check buttons */}
          <div className="absolute z-20 flex gap-3" style={{ bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
            <button
              onClick={onPlacementCancel}
              className="bg-white rounded-xl px-5 py-2.5 shadow-lg flex items-center justify-center"
              style={{ border: "1.5px solid #332D4E" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#332D4E" strokeWidth="2.5" strokeLinecap="round">
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
              style={{ background: "#332D4E" }}
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
