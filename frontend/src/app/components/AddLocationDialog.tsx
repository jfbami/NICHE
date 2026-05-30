import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Location } from "../types/location";
import { ApiError, createSpot, uploadPhoto } from "../lib/api";
import { spotToLocation } from "../lib/spotAdapter";

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpotCreated: (location: Location) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export function AddLocationDialog({
  open,
  onOpenChange,
  onSpotCreated,
  initialLatitude,
  initialLongitude,
}: AddLocationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setTags([]);
    setTagInput("");
    setIsPublic(true);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit =
    name.trim().length > 0 &&
    imageFile !== null &&
    initialLatitude !== undefined &&
    initialLongitude !== undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !imageFile) return;

    setSubmitting(true);
    try {
      const uploaded = await uploadPhoto(imageFile);
      const spot = await createSpot({
        title: name.trim(),
        description: description.trim(),
        lat: initialLatitude!,
        lng: initialLongitude!,
        isPublic,
        photoId: uploaded.photoId,
        photoUrl: uploaded.url,
        tags,
      });
      onSpotCreated(spotToLocation(spot));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Failed to create spot";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a hidden spot</DialogTitle>
          <DialogDescription>
            Share a niche find with the community. Add details that make this place special.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Hidden Waterfall"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this spot and what makes it special..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Photo</Label>
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
                  <span className="text-sm text-muted-foreground">Tap to select a photo</span>
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="visibility" className="text-base">Public</Label>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "Anyone can see this spot." : "Only your friends can see this spot."}
              </p>
            </div>
            <Switch id="visibility" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
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
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Uploading..." : "Upload Spot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
