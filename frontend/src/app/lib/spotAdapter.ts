import { Location } from "../types/location";

export interface BackendSpot {
  id: string;
  title: string;
  description?: string;
  address?: string;
  lat: number;
  lng: number;
  isPublic: boolean;
  ownerId: string;
  ownerUsername?: string;
  photoId: string | null;
  photoUrl: string | null;
  tags: string[];
  source: "user" | "reddit" | "instagram";
  redditPostUrl: string | null;
  instagramPostUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendSpotIndexEntry {
  id: string;
  title: string;
  lat: number;
  lng: number;
  isPublic: boolean;
  ownerId: string;
  photoUrl: string | null;
  createdAt: string;
  saveCount?: number;
  source?: "user" | "reddit" | "instagram";
}

export function spotToLocation(spot: BackendSpot | BackendSpotIndexEntry): Location {
  const full = spot as Partial<BackendSpot>;
  const indexEntry = spot as Partial<BackendSpotIndexEntry>;
  return {
    id: spot.id,
    name: spot.title,
    description: full.description ?? "",
    address: full.address,
    latitude: spot.lat,
    longitude: spot.lng,
    imageUrl: spot.photoUrl ?? "",
    uploadedBy: full.ownerUsername ?? "Someone",
    uploadedAt: new Date(spot.createdAt),
    tags: full.tags ?? [],
    isPublic: spot.isPublic,
    visibility: spot.isPublic ? "public" : "friends",
    saveCount: indexEntry.saveCount ?? 0,
    source: full.source ?? indexEntry.source ?? "user",
  };
}

export interface NewSpotPayload {
  title: string;
  description: string;
  lat: number;
  lng: number;
  isPublic: boolean;
  photoId: string | null;
  photoUrl: string | null;
  tags: string[];
}

export function locationDraftToSpotPayload(
  draft: Omit<Location, "id" | "uploadedAt" | "uploadedBy">,
  photo: { photoId: string | null; photoUrl: string | null },
): NewSpotPayload {
  return {
    title: draft.name,
    description: draft.description,
    lat: draft.latitude,
    lng: draft.longitude,
    isPublic: draft.isPublic,
    photoId: photo.photoId,
    photoUrl: photo.photoUrl,
    tags: draft.tags,
  };
}
