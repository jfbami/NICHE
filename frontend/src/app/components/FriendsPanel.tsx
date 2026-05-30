import { useState } from "react";
import { Friend } from "../types/friend";
import { UserPlus, Check, X, Users, Search, UserCheck } from "lucide-react";

interface FriendsPanelProps {
  friends: Friend[];
  onSendRequest: (username: string) => void;
  onAcceptRequest: (id: string) => void;
  onDeclineRequest: (id: string) => void;
  onRemoveFriend: (id: string) => void;
  onViewProfile: (friend: Friend) => void;
}

export function FriendsPanel({ friends, onSendRequest, onAcceptRequest, onDeclineRequest, onRemoveFriend, onViewProfile }: FriendsPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeSection, setActiveSection] = useState<"friends" | "requests">("friends");

  const accepted = friends.filter((f) => f.status === "accepted");
  const received = friends.filter((f) => f.status === "pending_received");
  const sent = friends.filter((f) => f.status === "pending_sent");

  const handleSend = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    onSendRequest(trimmed);
    setSearchInput("");
  };

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <Users className="size-4" />
          Friends
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSection("friends")}
            className="text-xs px-3 py-1 rounded-full transition-colors"
            style={{
              background: activeSection === "friends" ? "#2C1A0E" : "rgba(201,181,227,0.25)",
              color: activeSection === "friends" ? "#fff" : "#2C1A0E",
            }}
          >
            Friends {accepted.length > 0 && `(${accepted.length})`}
          </button>
          <button
            onClick={() => setActiveSection("requests")}
            className="text-xs px-3 py-1 rounded-full transition-colors relative"
            style={{
              background: activeSection === "requests" ? "#2C1A0E" : "rgba(201,181,227,0.25)",
              color: activeSection === "requests" ? "#fff" : "#2C1A0E",
            }}
          >
            Requests
            {received.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center" style={{ fontSize: 10 }}>
                {received.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Add friend input */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Add by username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2"
            style={{ "--tw-ring-color": "rgba(201,181,227,0.5)" } as React.CSSProperties}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!searchInput.trim()}
          className="flex items-center justify-center rounded-xl px-3 py-2 transition-colors disabled:opacity-40"
          style={{ background: "#2C1A0E" }}
        >
          <UserPlus className="size-4 text-white" />
        </button>
      </div>

      {activeSection === "friends" && (
        <div className="space-y-2">
          {accepted.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="size-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No friends yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Search by username to add friends.</p>
            </div>
          ) : (
            accepted.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5"
              >
                <button
                  className="flex items-center gap-2.5 flex-1 text-left"
                  onClick={() => onViewProfile(friend)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "#2C1A0E" }}>
                    {friend.displayName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{friend.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{friend.username}</p>
                  </div>
                </button>
                <button
                  onClick={() => onRemoveFriend(friend.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === "requests" && (
        <div className="space-y-3">
          {received.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Incoming</p>
              <div className="space-y-2">
                {received.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "#E8C49A" }}>
                        {friend.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{friend.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onAcceptRequest(friend.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "#2C1A0E" }}
                      >
                        <Check className="size-3.5 text-white" />
                      </button>
                      <button
                        onClick={() => onDeclineRequest(friend.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-background"
                      >
                        <X className="size-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Sent</p>
              <div className="space-y-2">
                {sent.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: "#E8C49A" }}>
                        {friend.displayName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{friend.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full" style={{ background: "rgba(201,181,227,0.25)" }}>
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {received.length === 0 && sent.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
