import { Location } from "./location";

export interface Friend {
  id: string;
  username: string;
  displayName: string;
  status: "accepted" | "pending_sent" | "pending_received";
  uploads?: Omit<Location, "uploadedAt">[];
}
