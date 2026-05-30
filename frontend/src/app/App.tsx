import { useState } from "react";
import { Input } from "./components/ui/input";
import { LocationCard } from "./components/LocationCard";
import { AddLocationDialog } from "./components/AddLocationDialog";
import { LocationDetailsDialog } from "./components/LocationDetailsDialog";
import { ShareDialog } from "./components/ShareDialog";
import { MapTab } from "./components/MapTab";
import { FriendsPanel } from "./components/FriendsPanel";
import { FriendProfileSheet } from "./components/FriendProfileSheet";
import { AuthScreen } from "./components/AuthScreen";
import { Location } from "./types/location";
import { Friend } from "./types/friend";
import { mockLocations } from "./data/mockData";
import { Plus, Search, Map, Heart, User, MapPin, Settings, Trash2, LogOut, ShieldCheck } from "lucide-react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { AuthUser, readUser, clearSession, isAdminUser } from "./lib/authStorage";
import { logout } from "./lib/api";
import { useRecommendations } from "./hooks/useRecommendations";

type TabType = "map" | "explore" | "favorites" | "profile";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(readUser);

  const isAdmin = currentUser !== null && isAdminUser(currentUser);

  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesQuery, setFavoritesQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.username ?? "Explorer");
  const [profileName, setProfileName] = useState(currentUser?.username ?? "Explorer");
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; id: string } | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: "f1", username: "wanderer99", displayName: "Alex W.", status: "accepted",
      uploads: [
        { id: "fw1", name: "Sunrise Ridge", description: "A quiet hilltop perfect for morning coffee and watching the city wake up.", latitude: 47.6250, longitude: -122.3150, imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", uploadedBy: "Alex W.", tags: ["sunrise", "views", "peaceful"], isPublic: true, visibility: "public" },
        { id: "fw2", name: "The Secret Pier", description: "An old wooden dock nobody visits anymore. Great for fishing and thinking.", latitude: 47.6180, longitude: -122.3600, imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", uploadedBy: "Alex W.", tags: ["waterfront", "hidden", "quiet"], isPublic: false, visibility: "friends" },
      ],
    },
    { id: "f2", username: "hiddenspots", displayName: "Jamie L.", status: "pending_received" },
    { id: "f3", username: "cityhiker", displayName: "Sam K.", status: "pending_sent" },
  ]);

  const recommendedLocations = useRecommendations(locations, favoriteIds);

  if (!currentUser) {
    return (
      <div
        className="flex flex-col"
        style={{ maxWidth: 430, margin: "0 auto", height: "100dvh", overflow: "hidden" }}
      >
        <Toaster />
        <AuthScreen onAuthenticated={(user) => {
          setCurrentUser(user);
          setProfileName(user.username);
          setNameInput(user.username);
        }} />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    clearSession();
    setCurrentUser(null);
    toast("Signed out.");
  };

  const visibleLocations = locations.filter(
    (loc) => loc.visibility === "public" || loc.visibility === "friends"
  );

  const filteredLocations = visibleLocations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exploreList = searchQuery ? filteredLocations : recommendedLocations;

  const favoriteLocations = locations.filter((loc) => favoriteIds.includes(loc.id));
  const filteredFavorites = favoriteLocations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(favoritesQuery.toLowerCase()) ||
      loc.description.toLowerCase().includes(favoritesQuery.toLowerCase()) ||
      loc.tags.some((tag) => tag.toLowerCase().includes(favoritesQuery.toLowerCase()))
  );

  const handleAddLocation = (newLocation: Omit<Location, "id" | "uploadedAt">) => {
    const location: Location = {
      ...newLocation,
      id: Date.now().toString(),
      uploadedAt: new Date(),
    };
    setLocations((prev) => [location, ...prev]);
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

  const handleDeleteLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setFavoriteIds((prev) => prev.filter((fid) => fid !== id));
    toast.success("Location deleted.");
  };

  const handleSendFriendRequest = (username: string) => {
    if (friends.some((f) => f.username === username)) {
      toast.error("Already connected with this user.");
      return;
    }
    const newFriend: Friend = {
      id: Date.now().toString(),
      username,
      displayName: username,
      status: "pending_sent",
    };
    setFriends((prev) => [...prev, newFriend]);
    toast.success(`Friend request sent to @${username}`);
  };

  const handleAcceptFriendRequest = (id: string) => {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, status: "accepted" } : f));
    toast.success("Friend request accepted!");
  };

  const handleDeclineFriendRequest = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    toast("Request declined.");
  };

  const handleRemoveFriend = (id: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    toast("Friend removed.");
  };

  return (
    <div
      className="bg-background flex flex-col"
      style={{ maxWidth: 430, margin: "0 auto", height: "100dvh", overflow: "hidden" }}
    >
      <Toaster />

      {/* Header */}
      <header className="border-b bg-background z-10 shadow-sm shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-3xl logo-font text-primary tracking-wide">neesh</h1>
          {isAdmin && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(212,24,61,0.12)", color: "#d4183d" }}
            >
              <ShieldCheck className="size-3.5" />
              Admin
            </div>
          )}
        </div>
      </header>

      {/* Map Tab — full bleed */}
      {activeTab === "map" && (
        <div style={{ flex: "1 1 0", position: "relative", overflow: "hidden", minHeight: 0 }}>
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
            flyToTarget={flyToTarget}
            onFlyToComplete={() => setFlyToTarget(null)}
          />
        </div>
      )}

      {/* Scrollable tabs */}
      {activeTab !== "map" && (
        <main
          className="flex-1 overflow-y-auto px-3 py-3 pb-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeTab === "explore" && (
            <>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-primary">
                  {searchQuery
                    ? `Search Results (${filteredLocations.length})`
                    : favoriteIds.length > 0
                      ? "Recommended for you"
                      : "Popular spots"}
                </h3>
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {favoriteIds.length > 0
                      ? "Based on the spots you've saved"
                      : "Save spots to personalize these"}
                  </p>
                )}
              </div>

              {exploreList.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No locations found</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Try a different search or add one!
                  </p>
                  <button
                    onClick={() => setAddDialogOpen(true)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-white text-sm"
                    style={{ background: "#2C1A0E" }}
                  >
                    <Plus className="size-4" />
                    Add Location
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 pb-2">
                  {exploreList.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onShare={handleShare}
                      onViewDetails={handleViewDetails}
                      isFavorite={favoriteIds.includes(location.id)}
                      onToggleFavorite={() => toggleFavorite(location.id)}
                      canDelete={isAdmin}
                      onDelete={handleDeleteLocation}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "favorites" && (
            <>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search favorites..."
                    value={favoritesQuery}
                    onChange={(e) => setFavoritesQuery(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-semibold text-primary">
                  {favoritesQuery ? "Results" : "Your Favorites"}
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(201,181,227,0.35)", color: "#2C1A0E" }}
                >
                  {favoritesQuery ? filteredFavorites.length : favoriteLocations.length}
                </span>
              </div>
              {filteredFavorites.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="size-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">
                    {favoritesQuery ? "No matches found" : "No favorites yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {favoritesQuery
                      ? "Try a different search"
                      : "Tap the heart icon on locations to save them here"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredFavorites.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      onShare={handleShare}
                      onViewDetails={handleViewDetails}
                      isFavorite={true}
                      onToggleFavorite={() => toggleFavorite(location.id)}
                      canDelete={isAdmin}
                      onDelete={handleDeleteLocation}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "profile" && (
            <div className="py-4">
              {/* Avatar */}
              <div className="text-center mb-5">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-accent flex items-center justify-center">
                    {profileImage
                      ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      : <User className="size-10 text-primary" />
                    }
                  </div>
                  <label
                    htmlFor="profile-image-upload"
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-md"
                    style={{ background: "#2C1A0E", border: "2px solid #faf7f4" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </label>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setProfileImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                <h2 className="mb-0.5 text-primary">{profileName}</h2>
                <p className="text-sm text-muted-foreground">@{profileName.toLowerCase().replace(/\s+/g, "")}</p>
                {isAdmin && (
                  <div
                    className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(212,24,61,0.12)", color: "#d4183d" }}
                  >
                    <ShieldCheck className="size-3" />
                    Administrator
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-card border rounded-xl p-3 text-center">
                  <p className="font-semibold text-primary text-lg">
                    {locations.filter((l) => l.uploadedBy === profileName || l.uploadedBy === "Anonymous").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                </div>
                <div className="bg-card border rounded-xl p-3 text-center">
                  <p className="font-semibold text-primary text-lg">
                    {friends.filter((f) => f.status === "accepted").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Friends</p>
                </div>
              </div>

              {/* Settings */}
              <button
                onClick={() => { setNameInput(profileName); setSettingsOpen((o) => !o); }}
                className="w-full flex items-center justify-between bg-card border rounded-xl px-4 py-3 mb-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="size-4 text-muted-foreground" />
                  <span className="text-sm text-primary">Settings</span>
                </div>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-muted-foreground"
                  style={{ transform: settingsOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
                >
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              {settingsOpen && (
                <div className="bg-card border rounded-xl p-4 mb-2 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Display Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2"
                        style={{ "--tw-ring-color": "rgba(232,196,154,0.5)" } as React.CSSProperties}
                        placeholder="Your name"
                      />
                      <button
                        onClick={() => {
                          if (nameInput.trim()) {
                            setProfileName(nameInput.trim());
                            setSettingsOpen(false);
                            toast.success("Name updated!");
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-sm text-white"
                        style={{ background: "#2C1A0E" }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Log out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-3 mb-4 transition-colors hover:bg-red-50"
              >
                <LogOut className="size-4 text-muted-foreground" />
                <span className="text-sm" style={{ color: "#d4183d" }}>Sign out</span>
              </button>

              {/* My uploads */}
              {(() => {
                const myLocations = locations.filter(
                  (l) => l.uploadedBy === profileName || l.uploadedBy === "Anonymous"
                );
                if (myLocations.length === 0) return null;
                return (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-primary">My Uploads</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(232,196,154,0.35)", color: "#2C1A0E" }}
                      >
                        {myLocations.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {myLocations.map((loc) => (
                        <div key={loc.id} className="flex items-center gap-3 bg-card border rounded-xl p-2.5">
                          <img
                            src={loc.imageUrl}
                            alt={loc.name}
                            className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-pointer"
                            onClick={() => {
                              setFlyToTarget({ lat: loc.latitude, lng: loc.longitude, id: loc.id });
                              setActiveTab("map");
                            }}
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setFlyToTarget({ lat: loc.latitude, lng: loc.longitude, id: loc.id });
                              setActiveTab("map");
                            }}
                          >
                            <p className="text-sm font-medium text-primary truncate">{loc.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{loc.visibility}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <FriendsPanel
                friends={friends}
                onSendRequest={handleSendFriendRequest}
                onAcceptRequest={handleAcceptFriendRequest}
                onDeclineRequest={handleDeclineFriendRequest}
                onRemoveFriend={handleRemoveFriend}
                onViewProfile={(friend) => setSelectedFriend(friend)}
              />
            </div>
          )}
        </main>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="bg-background border-t z-20 shrink-0">
        <div className="flex items-center h-16">
          {(["map", "explore"] as const).map((tab) => {
            const Icon = tab === "map" ? Map : MapPin;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  activeTab === tab ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-5 ${activeTab === tab ? "fill-primary" : ""}`} />
                <span className="text-xs capitalize">{tab}</span>
              </button>
            );
          })}

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
        profileName={profileName}
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

      {selectedFriend && (
        <div className="absolute inset-0 z-40" style={{ maxWidth: 430, margin: "0 auto" }}>
          <FriendProfileSheet
            friend={selectedFriend}
            onClose={() => setSelectedFriend(null)}
            onViewOnMap={(lat, lng, id) => {
              setFlyToTarget({ lat, lng, id });
              setActiveTab("map");
            }}
          />
        </div>
      )}
    </div>
  );
}
