import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { LocationCard } from "./components/LocationCard";
import { AddLocationDialog } from "./components/AddLocationDialog";
import { LocationDetailsDialog } from "./components/LocationDetailsDialog";
import { ShareDialog } from "./components/ShareDialog";
import { MapTab } from "./components/MapTab";
import { AuthScreen } from "./components/AuthScreen";
import { Location } from "./types/location";
import { useSpots } from "./hooks/useSpots";
import { useFavorites } from "./hooks/useFavorites";
import { AuthUser, clearSession, readUser } from "./lib/authStorage";
import { Plus, Search, Map, Heart, User, MapPin, LogOut } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

type TabType = "map" | "explore" | "favorites" | "profile";

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => readUser());
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  if (!authUser) {
    return (
      <div className="h-screen bg-background flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
        <Toaster />
        <AuthScreen onAuthenticated={setAuthUser} />
      </div>
    );
  }

  return (
    <AuthenticatedApp
      authUser={authUser}
      onSignOut={() => {
        clearSession();
        setAuthUser(null);
      }}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      addDialogOpen={addDialogOpen}
      setAddDialogOpen={setAddDialogOpen}
      detailsDialogOpen={detailsDialogOpen}
      setDetailsDialogOpen={setDetailsDialogOpen}
      shareDialogOpen={shareDialogOpen}
      setShareDialogOpen={setShareDialogOpen}
      selectedLocation={selectedLocation}
      setSelectedLocation={setSelectedLocation}
      placementMode={placementMode}
      setPlacementMode={setPlacementMode}
      pendingCoords={pendingCoords}
      setPendingCoords={setPendingCoords}
    />
  );
}

interface AuthenticatedAppProps {
  authUser: AuthUser;
  onSignOut: () => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addDialogOpen: boolean;
  setAddDialogOpen: (open: boolean) => void;
  detailsDialogOpen: boolean;
  setDetailsDialogOpen: (open: boolean) => void;
  shareDialogOpen: boolean;
  setShareDialogOpen: (open: boolean) => void;
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  placementMode: boolean;
  setPlacementMode: (mode: boolean) => void;
  pendingCoords: { lat: number; lng: number } | null;
  setPendingCoords: (coords: { lat: number; lng: number } | null) => void;
}

function AuthenticatedApp({
  authUser,
  onSignOut,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  addDialogOpen,
  setAddDialogOpen,
  detailsDialogOpen,
  setDetailsDialogOpen,
  shareDialogOpen,
  setShareDialogOpen,
  selectedLocation,
  setSelectedLocation,
  placementMode,
  setPlacementMode,
  pendingCoords,
  setPendingCoords,
}: AuthenticatedAppProps) {
  const { locations, loading, error, reload, addLocal } = useSpots();
  const { favoriteIds, toggle: toggleFavorite } = useFavorites();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const filteredLocations = locations.filter((location) => {
    const query = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(query) ||
      location.description.toLowerCase().includes(query) ||
      location.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const favoriteLocations = locations.filter((loc) => favoriteIds.includes(loc.id));

  const handleSpotCreated = (location: Location) => {
    addLocal(location);
    toast.success("Spot added!");
    reload();
  };

  const handleViewDetails = (location: Location) => {
    setSelectedLocation(location);
    setDetailsDialogOpen(true);
  };

  const handleShare = (location: Location) => {
    setSelectedLocation(location);
    setShareDialogOpen(true);
  };

  return (
    <div className="h-screen bg-background flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <Toaster />

      <header className="border-b bg-background z-10 shadow-sm shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-3xl logo-font text-primary tracking-wide">neesh</h1>
          <button
            onClick={onSignOut}
            className="text-muted-foreground hover:text-primary"
            aria-label="Sign out"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

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

      {activeTab !== "map" && (
        <main className="flex-1 overflow-y-auto px-3 py-3 pb-3">
          {activeTab === "explore" && (
            <>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search spots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-primary">
                  {searchQuery ? `Search Results (${filteredLocations.length})` : "All Spots"}
                </h3>
              </div>

              {loading && (
                <p className="text-center text-sm text-muted-foreground py-8">Loading spots...</p>
              )}

              {!loading && filteredLocations.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No spots found</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Try a different search or add one!
                  </p>
                  <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    Add Spot
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
                    Tap the heart icon on spots to save them here
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
                <h2 className="mb-1 text-primary">{authUser.username}</h2>
                <p className="text-sm text-muted-foreground">{authUser.email}</p>
              </div>

              <div className="space-y-3">
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Spots Saved</span>
                    <span className="font-semibold text-primary">{favoriteLocations.length}</span>
                  </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Spots Visible</span>
                    <span className="font-semibold text-primary">{locations.length}</span>
                  </div>
                </div>
                <Button onClick={onSignOut} variant="outline" className="w-full gap-2 mt-4">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </main>
      )}

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

      <AddLocationDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setPendingCoords(null);
        }}
        onSpotCreated={handleSpotCreated}
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
