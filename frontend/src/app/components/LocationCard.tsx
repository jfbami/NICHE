import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, Users, Trash2 } from "lucide-react";
import { Location } from "../types/location";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface LocationCardProps {
  location: Location;
  onShare: (location: Location) => void;
  onViewDetails: (location: Location) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export function LocationCard({
  location,
  onShare,
  onViewDetails,
  isFavorite,
  onToggleFavorite,
  canDelete,
  onDelete,
}: LocationCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/5", height: "auto" }}>
        <ImageWithFallback
          src={location.imageUrl}
          alt={location.name}
          className="w-full h-full object-cover"
        />
        {location.isRecommended && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(201,181,227,0.92)", color: "#2C1A0E", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.02em" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#2C1A0E">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            neesh recommended
          </div>
        )}
        {location.visibility === "friends" && !location.isRecommended && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-white"
            style={{ background: "rgba(51,45,78,0.75)", fontSize: "0.68rem" }}
          >
            <Users className="size-3" />
            Friends only
          </div>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete?.(location.id)}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full shadow-md transition-opacity hover:opacity-90"
            style={{ background: "rgba(212,24,61,0.85)" }}
            title="Delete location (admin)"
          >
            <Trash2 className="size-3.5 text-white" />
          </button>
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <p className="text-primary mb-1" style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.3 }}>
          {location.name}
        </p>
        {location.description ? (
          <p className="text-muted-foreground line-clamp-2 mb-2" style={{ fontSize: "0.8rem", lineHeight: 1.4 }}>
            {location.description}
          </p>
        ) : (
          <div className="mb-2" />
        )}
        {location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {location.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-accent/30 text-primary" style={{ fontSize: "0.7rem", padding: "1px 7px" }}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => onViewDetails(location)} className="flex-1 h-9" style={{ fontSize: "0.82rem" }}>
            View Details
          </Button>
          <button
            onClick={onToggleFavorite}
            className="flex items-center justify-center rounded-xl border border-border bg-background h-9"
            style={{ width: 40 }}
          >
            <Heart className={`size-4 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
          <button
            onClick={() => onShare(location)}
            className="flex items-center justify-center rounded-xl border border-border bg-background h-9"
            style={{ width: 40 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
