import { useCallback, useEffect, useState } from "react";
import {
  fetchFriends,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend as removeFriendRequest,
  FriendRecord,
} from "../lib/api";

export interface FriendsState {
  friends: FriendRecord[];
  loading: boolean;
  sendRequest: (username: string) => Promise<void>;
  accept: (friendId: string) => Promise<void>;
  remove: (friendId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useFriends(enabled: boolean): FriendsState {
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setFriends(await fetchFriends());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sendRequest = useCallback(async (username: string) => {
    await sendFriendRequest(username);
    await reload();
  }, [reload]);

  const accept = useCallback(async (friendId: string) => {
    await acceptFriendRequest(friendId);
    await reload();
  }, [reload]);

  const remove = useCallback(async (friendId: string) => {
    await removeFriendRequest(friendId);
    await reload();
  }, [reload]);

  return { friends, loading, sendRequest, accept, remove, reload };
}
