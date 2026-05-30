import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, Image as ImageIcon, Globe, Users, Lock } from "lucide-react";
import { Location } from "../types/location";

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLocation: (location: Omit<Location, "id" | "uploadedAt">) => void;
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
    if (!name || !imageUrl) return;

    onAddLocation({
      name,
      description,
      latitude: initialLatitude ?? 0,
      longitude: initialLongitude ?? 0,
      imageUrl,
      uploadedBy: isAnonymous ? "Anonymous" : profileName,
      tags,
      isPublic: visibility === "public",
      visibility,
    });

    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setIsAnonymous(false);
    setVisibility("public");
    setTags([]);
    setTagInput("");
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
            <Label htmlFor="image">Photo</Label>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="image"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {imageUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={imageUrl} alt="Preview" className="max-h-32 rounded-lg" />
                    <span className="text-sm text-muted-foreground">Tap to change photo</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="size-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tap to select from photo library</span>
                  </div>
                )}
              </label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                required
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
            <Button type="submit">Upload Location</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
