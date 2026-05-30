import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapPin, Calendar, User, Share2, ExternalLink } from "lucide-react";
import { Location } from "../types/location";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface LocationDetailsDialogProps {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (location: Location) => void;
}

export function LocationDetailsDialog({ location, open, onOpenChange, onShare }: LocationDetailsDialogProps) {
  if (!location) return null;

  const openInMaps = () => {
    window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location.name}</DialogTitle>
          <DialogDescription>
            Uploaded by {location.uploadedBy} on {location.uploadedAt.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative h-64 md:h-96 overflow-hidden rounded-lg">
            <ImageWithFallback
              src={location.imageUrl}
              alt={location.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{location.description}</p>
            </div>

            <div className="flex items-start gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                {location.address && (
                  <div className="text-foreground">{location.address}</div>
                )}
                <div className="font-mono text-xs text-muted-foreground">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={openInMaps} className="gap-1">
                <ExternalLink className="size-3" />
                Open in Maps
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4" />
              <span>{location.uploadedBy}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              <span>{location.uploadedAt.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>

            {location.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {location.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={() => onShare(location)} className="w-full gap-2">
                <Share2 className="size-4" />
                Share Location
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
