import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { LocationCard } from "./components/LocationCard";
import { AddLocationDialog } from "./components/AddLocationDialog";
import { LocationDetailsDialog } from "./components/LocationDetailsDialog";
import { ShareDialog } from "./components/ShareDialog";
import { MapTab } from "./components/MapTab";
import { Location } from "./types/location";
import { mockLocations } from "./data/mockData";
import { Plus, Search, Map, Heart, User, MapPin } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type TabType = "map" | "explore" | "favorites" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const favoriteLocations = locations.filter((loc) => favoriteIds.includes(loc.id));

  const handleAddLocation = (newLocation: Omit<Location, "id" | "uploadedAt">) => {
    const location: Location = {
      ...newLocation,
      id: Date.now().toString(),
      uploadedAt: new Date(),
    };
    setLocations([location, ...locations]);
    toast.success("Location uploaded successfully!");
  };

  const handleViewDetails = (location: Location) => {
    setSelectedLocation(location);
    setDetailsDialogOpen(true);
  };

  const handleShare = (location: Location) => {
    setSelectedLocation(location);
    setShareDialogOpen(true);
  };

  const toggleFavorite = (locationId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <Toaster />

      {/* Header */}
      <header className="border-b bg-background z-10 shadow-sm shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <h1 className="text-3xl logo-font text-primary tracking-wide">neesh</h1>
          </div>
        </div>
      </header>

      {/* Map Tab — full bleed */}
      {activeTab === "map" && (
        <div className="flex-1 relative overflow-hidden">
          <MapTab
            locations={locations}
            favoriteIds={favoriteIds}
            onViewDetails={handleViewDetails}
            onToggleFavorite={toggleFavorite}
            placementMode={placementMode}
            onPlacementConfirm={(lat, lng) => {
              setPendingCoords({ lat, lng });
              setPlacementMode(false);
              setAddDialogOpen(true);
            }}
            onPlacementCancel={() => setPlacementMode(false)}
          />
        </div>
      )}

      {/* Scrollable tabs */}
      {activeTab !== "map" && (
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-3">
        {activeTab === "explore" && (
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>
            </div>

            {/* Section Title */}
            <div className="mb-4">
              <h3 className="font-semibold text-primary">
                {searchQuery ? `Search Results (${filteredLocations.length})` : "All Locations"}
              </h3>
            </div>

            {/* Locations Grid */}
            {filteredLocations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No locations found</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Try a different search or add one!
                </p>
                <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                  <Plus className="size-4" />
                  Add Location
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 pb-2">
                {filteredLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onShare={handleShare}
                    onViewDetails={handleViewDetails}
                    isFavorite={favoriteIds.includes(location.id)}
                    onToggleFavorite={() => toggleFavorite(location.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "favorites" && (
          <>
            <h2 className="mb-4 text-primary">Your Favorites</h2>
            {favoriteLocations.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="size-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No favorites yet</h3>
                <p className="text-sm text-muted-foreground">
                  Tap the heart icon on locations to save them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {favoriteLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onShare={handleShare}
                    onViewDetails={handleViewDetails}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(location.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "profile" && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-accent rounded-full mx-auto mb-3 flex items-center justify-center">
                <User className="size-10 text-primary" />
              </div>
              <h2 className="mb-1 text-primary">Welcome</h2>
              <p className="text-sm text-muted-foreground">Location Explorer</p>
            </div>

            <div className="space-y-3">
              <div className="bg-card border rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Locations Saved</span>
                  <span className="font-semibold text-primary">{favoriteLocations.length}</span>
                </div>
              </div>
              <div className="bg-card border rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Locations</span>
                  <span className="font-semibold text-primary">{locations.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="bg-background border-t z-20 shrink-0">
        <div className="flex items-center h-16">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === "map" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Map className={`size-5 ${activeTab === "map" ? "fill-primary" : ""}`} />
            <span className="text-xs">Map</span>
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === "explore" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MapPin className={`size-5 ${activeTab === "explore" ? "fill-primary" : ""}`} />
            <span className="text-xs">Explore</span>
          </button>
          <div className="flex-1 flex items-center justify-center h-full">
            <button
              onClick={() => {
                if (activeTab === "map") {
                  setPlacementMode(true);
                } else {
                  setActiveTab("map");
                  setTimeout(() => setPlacementMode(true), 100);
                }
              }}
              className="bg-primary rounded-full p-3 -mt-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="size-6 text-white" />
            </button>
          </div>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === "favorites" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Heart className={`size-5 ${activeTab === "favorites" ? "fill-primary" : ""}`} />
            <span className="text-xs">Favorites</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User className={`size-5 ${activeTab === "profile" ? "fill-primary" : ""}`} />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>

      {/* Dialogs */}
      <AddLocationDialog
        open={addDialogOpen}
        onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setPendingCoords(null); }}
        onAddLocation={handleAddLocation}
        initialLatitude={pendingCoords?.lat}
        initialLongitude={pendingCoords?.lng}
      />
      <LocationDetailsDialog
        location={selectedLocation}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onShare={handleShare}
      />
      <ShareDialog
        location={selectedLocation}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}
