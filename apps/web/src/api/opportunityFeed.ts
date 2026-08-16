import { apiRequest } from "./client";

export type OpportunityFeedItemType =
  | "NEW_SCHOLARSHIP"
  | "UPCOMING_DEADLINE"
  | "MATCHING_UNIVERSITY"
  | "VISA_UPDATE"
  | "REQUIREMENT_CHANGE"
  | "COUNTRY_INSIGHT"
  | "PROFILE_NUDGE"
  | "READINESS_ALERT";

export type OpportunityFeedItemPriority = "HIGH" | "MEDIUM" | "LOW";

export type OpportunityFeedItem = {
  id: string;
  type: OpportunityFeedItemType;
  priority: OpportunityFeedItemPriority;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  actionLabel?: string;
  actionHref?: string;
  createdAt: string;
};

export type OpportunityFeedResponse = {
  items: OpportunityFeedItem[];
  totalCount: number;
  hasProfile: boolean;
  profileComplete: boolean;
};

export function fetchOpportunityFeed(token: string): Promise<OpportunityFeedResponse> {
  return apiRequest<OpportunityFeedResponse>("/opportunity-feed", {
    token,
    cacheTtlMs: 60_000
  });
}
