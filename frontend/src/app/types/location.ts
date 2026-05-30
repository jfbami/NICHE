export interface Location {
  id: string;
  name: string;
  description: string;
  address?: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  tags: string[];
  isPublic: boolean;
  visibility: "public" | "friends" | "private";
  source?: "user" | "reddit" | "instagram";
  saveCount?: number;
}
