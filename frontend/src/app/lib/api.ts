import { readToken, persistSession, clearSession, AuthUser } from "./authStorage";
import {
  BackendSpot,
  BackendSpotIndexEntry,
  NewSpotPayload,
  spotToLocation,
} from "./spotAdapter";
import { Location } from "../types/location";

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !options.isFormData) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.isFormData
      ? (options.body as FormData)
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error ?? data?.message ?? response.statusText;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: { username, email, password },
  });
  persistSession(result.token, result.user);
  return result.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  persistSession(result.token, result.user);
  return result.user;
}

export function logout(): void {
  clearSession();
}

export interface BoundingBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export function fetchSpotsInBounds(
  bounds?: BoundingBox,
): Promise<BackendSpotIndexEntry[]> {
  const query = bounds
    ? `?swLat=${bounds.swLat}&swLng=${bounds.swLng}&neLat=${bounds.neLat}&neLng=${bounds.neLng}`
    : "";
  return request<BackendSpotIndexEntry[]>(`/api/spots${query}`);
}

export function fetchSpotById(id: string): Promise<BackendSpot> {
  return request<BackendSpot>(`/api/spots/${id}`);
}

export function fetchSavedSpots(): Promise<BackendSpotIndexEntry[]> {
  return request<BackendSpotIndexEntry[]>(`/api/spots/saved`);
}

export function saveSpot(id: string): Promise<{ saved: string[] }> {
  return request<{ saved: string[] }>(`/api/spots/${id}/save`, { method: "POST" });
}

export function unsaveSpot(id: string): Promise<{ saved: string[] }> {
  return request<{ saved: string[] }>(`/api/spots/${id}/save`, { method: "DELETE" });
}

export function createSpot(payload: NewSpotPayload): Promise<BackendSpot> {
  return request<BackendSpot>("/api/spots", { method: "POST", body: payload });
}

export interface UploadedPhoto {
  photoId: string;
  boxFileId: string;
  url: string;
}

export function uploadPhoto(file: File): Promise<UploadedPhoto> {
  const form = new FormData();
  form.append("photo", file);
  return request<UploadedPhoto>("/api/photos", {
    method: "POST",
    body: form,
    isFormData: true,
  });
}

export function deleteSpot(id: string): Promise<void> {
  return request<void>(`/api/spots/${id}`, { method: "DELETE" });
}

export type FriendStatus = "accepted" | "pending_sent" | "pending_received";

export interface FriendRecord {
  id: string;
  username: string;
  displayName: string;
  status: FriendStatus;
}

export function fetchFriends(): Promise<FriendRecord[]> {
  return request<FriendRecord[]>("/api/users/me/friends");
}

export function sendFriendRequest(username: string): Promise<FriendRecord> {
  return request<FriendRecord>("/api/users/me/friends/request", {
    method: "POST",
    body: { username },
  });
}

export function acceptFriendRequest(friendId: string): Promise<{ id: string; status: FriendStatus }> {
  return request(`/api/users/me/friends/${friendId}/accept`, { method: "POST" });
}

export function removeFriend(friendId: string): Promise<void> {
  return request<void>(`/api/users/me/friends/${friendId}`, { method: "DELETE" });
}

export async function fetchFriendUploads(ownerId: string): Promise<Location[]> {
  const entries = await fetchSpotsInBounds();
  return entries.filter((entry) => entry.ownerId === ownerId).map(spotToLocation);
}

export interface AddressSuggestion {
  address: string;
  lat: number;
  lng: number;
}

export function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  return request<AddressSuggestion[]>(`/api/geocode/search?q=${encodeURIComponent(query)}`);
}
