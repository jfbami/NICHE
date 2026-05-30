import { Friend } from "../types/friend";
import { X, MapPin, Users, Globe, Lock } from "lucide-react";

interface FriendProfileSheetProps {
  friend: Friend | null;
  onClose: () => void;
  onViewOnMap: (lat: number, lng: number, id: string) => void;
}

const visibilityIcon = { public: Globe, friends: Users, private: Lock };
const visibilityLabel = { public: "Public", friends: "Friends only", private: "Private" };

export function FriendProfileSheet({ friend, onClose, onViewOnMap }: FriendProfileSheetProps) {
  if (!friend) return null;

  const uploads = friend.uploads ?? [];
  const visible = uploads.filter((u) => u.visibility === "public" || u.visibility === "friends");

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl"
        style={{ maxHeight: "80%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ background: "#2C1A0E" }}
            >
              {friend.displayName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-primary">{friend.displayName}</p>
              <p className="text-xs text-muted-foreground">@{friend.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(232,196,154,0.25)" }}
          >
            <X className="size-4 text-primary" />
          </button>
        </div>

        {/* Uploads */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(80vh - 110px)", scrollbarWidth: "none" }}>
          {visible.length === 0 ? (
            <div className="text-center py-10">
              <MapPin className="size-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No shared locations yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
                {visible.length} location{visible.length !== 1 ? "s" : ""}
              </p>
              {visible.map((loc) => {
                const Icon = visibilityIcon[loc.visibility];
                return (
                  <div
                    key={loc.id}
                    className="rounded-2xl overflow-hidden border border-border bg-card"
                  >
                    <div className="relative" style={{ aspectRatio: "4/3" }}>
                      <img
                        src={loc.imageUrl}
                        alt={loc.name}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: "rgba(44,26,14,0.7)", color: "#fff" }}
                      >
                        <Icon className="size-3" />
                        {visibilityLabel[loc.visibility]}
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="font-semibold text-sm text-primary mb-1">{loc.name}</p>
                      {loc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{loc.description}</p>
                      )}
                      {loc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {loc.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(232,196,154,0.35)", color: "#2C1A0E" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { onViewOnMap(loc.latitude, loc.longitude, loc.id); onClose(); }}
                        className="w-full text-white text-xs py-2 rounded-xl"
                        style={{ background: "#2C1A0E" }}
                      >
                        View on Map
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
