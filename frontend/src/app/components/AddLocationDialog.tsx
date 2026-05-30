import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X, Image as ImageIcon } from "lucide-react";
import { Location } from "../types/location";

interface AddLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLocation: (location: Omit<Location, "id" | "uploadedAt">) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export function AddLocationDialog({ open, onOpenChange, onAddLocation, initialLatitude, initialLongitude }: AddLocationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedBy, setUploadedBy] = useState("");
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
    if (!name || !imageUrl || !uploadedBy) return;

    onAddLocation({
      name,
      description,
      latitude: initialLatitude ?? 0,
      longitude: initialLongitude ?? 0,
      imageUrl,
      uploadedBy,
      tags,
      isPublic: true,
    });

    setName("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setUploadedBy("");
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

          <div className="space-y-2">
            <Label htmlFor="uploadedBy">Your Name</Label>
            <Input
              id="uploadedBy"
              placeholder="e.g., Explorer42"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              required
            />
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
