import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface SubscriptionStatus {
  isPremium: boolean;
  scansThisMonth: number;
  scansLimit: number;
  scansRemaining: number | null;
  subscription: {
    id: number;
    expiresAt: string;
    plan: string;
    note?: string;
  } | null;
  priceFcfa: number;
}

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/me"],
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  return {
    ...query,
    isPremium: query.data?.isPremium ?? false,
    scansRemaining: query.data?.scansRemaining ?? null,
    scansThisMonth: query.data?.scansThisMonth ?? 0,
    scansLimit: query.data?.scansLimit ?? 3,
  };
}
