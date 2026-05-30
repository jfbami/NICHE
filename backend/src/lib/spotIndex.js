export function toIndexEntry(spot) {
  return {
    id: spot.id,
    title: spot.title,
    description: spot.description,
    lat: spot.lat,
    lng: spot.lng,
    isPublic: spot.isPublic,
    ownerId: spot.ownerId,
    ownerUsername: spot.ownerUsername,
    photoUrl: spot.photoUrl,
    tags: spot.tags,
    createdAt: spot.createdAt,
  };
}
