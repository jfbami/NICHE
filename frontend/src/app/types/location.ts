export interface Location {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  tags: string[];
  isPublic: boolean;
  visibility: "public" | "friends" | "private";
  isRecommended?: boolean;
  saveCount?: number;
}
