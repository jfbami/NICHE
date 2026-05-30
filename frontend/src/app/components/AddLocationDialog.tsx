import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, Image as ImageIcon, Camera, Globe, Users, Lock, MapPin, Loader2 } from "lucide-react";
import { Location } from "../types/location";
import { searchAddresses, AddressSuggestion } from "../lib/api";

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLocation: (
    location: Omit<Location, "id" | "uploadedAt">,
    imageFile: File | null,
  ) => void | Promise<void>;
  initialLatitude?: number;
  initialLongitude?: number;
  profileName?: string;
}

export function AddLocationDialog({ open, onOpenChange, onAddLocation, initialLatitude, initialLongitude, profileName = "Explorer" }: AddLocationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Seed coords from map placement mode when the dialog opens.
  useEffect(() => {
    if (open && initialLatitude != null && initialLongitude != null) {
      setCoords({ lat: initialLatitude, lng: initialLongitude });
    }
  }, [open, initialLatitude, initialLongitude]);

  // Debounced address autocomplete.
  useEffect(() => {
    const query = addressQuery.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setSuggestions(await searchAddresses(query));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [addressQuery]);

  const handleSelectSuggestion = (s: AddressSuggestion) => {
    setCoords({ lat: s.lat, lng: s.lng });
    setAddress(s.address);
    setAddressQuery(s.address);
    setSuggestions([]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !coords || !imageFile) return;

    onAddLocation(
      {
        name,
        description,
        address: address || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        imageUrl,
        uploadedBy: isAnonymous ? "Anonymous" : profileName,
        tags,
        isPublic: visibility === "public",
        visibility,
      },
      imageFile,
    );

    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setIsAnonymous(false);
    setVisibility("public");
    setTags([]);
    setTagInput("");
    setCoords(null);
    setAddress("");
    setAddressQuery("");
    setSuggestions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Unknown Location</DialogTitle>
          <DialogDescription>
            Share a hidden gem with the community. Add details about this mysterious place.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              placeholder="e.g., Hidden Waterfall"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="Describe this location and what makes it special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Address {coords ? <span className="text-green-700 text-xs">✓ pinned</span> : <span className="text-muted-foreground text-xs">(search to set the pin)</span>}
            </Label>
            <div className="relative">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="Search an address or place..."
                  value={addressQuery}
                  onChange={(e) => {
                    setAddressQuery(e.target.value);
                    setCoords(initialLatitude != null && initialLongitude != null && e.target.value === ""
                      ? { lat: initialLatitude, lng: initialLongitude }
                      : null);
                  }}
                  className="pl-9"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
                )}
              </div>
              {suggestions.length > 0 && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg overflow-hidden"
                  style={{ borderColor: "rgba(201,181,227,0.5)" }}
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.lat}-${s.lng}-${i}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-start gap-2 border-b last:border-b-0"
                      style={{ borderColor: "rgba(201,181,227,0.25)" }}
                    >
                      <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm leading-snug" style={{ color: "#2C1A0E" }}>{s.address}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {initialLatitude != null && initialLongitude != null && !addressQuery && (
              <p className="text-xs text-muted-foreground">Using the spot you dropped on the map. Search above to override.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Photo <span className="text-destructive text-xs">(required)</span></Label>
            <div className="flex flex-col gap-2">
              {imageUrl && (
                <label
                  htmlFor="image-library"
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <img src={imageUrl} alt="Preview" className="max-h-32 rounded-lg" />
                    <span className="text-sm text-muted-foreground">Tap to change photo</span>
                  </div>
                </label>
              )}
              {!imageUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <label
                    htmlFor="image-library"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <ImageIcon className="size-7 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Choose Photo</span>
                  </label>
                  <label
                    htmlFor="image-camera"
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Camera className="size-7 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Take Photo</span>
                  </label>
                </div>
              )}
              <Input
                id="image-library"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Input
                id="image-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(201,181,227,0.2)", border: "1.5px solid rgba(201,181,227,0.5)" }}>
            <div>
              <p className="text-sm" style={{ color: "#2C1A0E" }}>
                {isAnonymous ? "Posting as Anonymous" : `Posting as ${profileName}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isAnonymous ? "Your name won't be shown" : "Your profile name will be visible"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
              style={{ background: isAnonymous ? "#2C1A0E" : "#E8C49A" }}
              aria-pressed={isAnonymous}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out"
                style={{ transform: isAnonymous ? "translate(1.25rem, 0.125rem)" : "translate(0.125rem, 0.125rem)" }}
              />
            </button>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Who can see this?</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["public", "friends", "private"] as const).map((v) => {
                const icons = { public: Globe, friends: Users, private: Lock };
                const labels = { public: "Everyone", friends: "Friends", private: "Only Me" };
                const Icon = icons[v];
                const selected = visibility === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border transition-colors"
                    style={{
                      background: selected ? "#2C1A0E" : "rgba(201,181,227,0.15)",
                      borderColor: selected ? "#2C1A0E" : "rgba(201,181,227,0.4)",
                      color: selected ? "#fff" : "#2C1A0E",
                    }}
                  >
                    <Icon className="size-4" />
                    <span style={{ fontSize: "0.72rem" }}>{labels[v]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !coords || !imageFile}>Upload Location</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
