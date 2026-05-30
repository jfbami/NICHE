import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, Check, Facebook, Twitter, Mail } from "lucide-react";
import { Location } from "../types/location";
import { useState } from "react";

interface ShareDialogProps {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ location, open, onOpenChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!location) return null;

  const shareUrl = `${window.location.origin}?spot=${location.id}`;
  const shareText = `neesh: ${location.name}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Location</DialogTitle>
          <DialogDescription>
            Share "{location.name}" with your friends
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-link">Share Link</Label>
            <div className="flex gap-2">
              <Input
                id="share-link"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyToClipboard} size="sm" className="gap-1">
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={shareOnTwitter} variant="outline" className="gap-2">
                <Twitter className="size-4" />
                Twitter
              </Button>
              <Button onClick={shareOnFacebook} variant="outline" className="gap-2">
                <Facebook className="size-4" />
                Facebook
              </Button>
              <Button onClick={shareViaEmail} variant="outline" className="gap-2">
                <Mail className="size-4" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
