"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { DelegatePageHeader } from "@/components/delegates/DelegatePageHeader";
import { DelegateCard } from "@/components/delegates/DelegateCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useActiveDelegates, useMyEligibility } from "@/lib/queries";
import { useEnsProfiles } from "@/lib/hooks/useEnsProfiles";
import { useRouter } from "next/navigation";

export default function DelegatesPage() {
  const router = useRouter();
  const { data: delegates, isLoading, isError, refetch } = useActiveDelegates();
  const { data: eligibility } = useMyEligibility();
  const { data: profiles } = useEnsProfiles(delegates?.delegates ?? []);

  const handleDelegate = (address: string) => {
    // Navigate to delegation flow (Task 9 will handle the actual tx)
    router.push(`/delegates?delegate=${address}`);
  };

  return (
    <PageContainer>
      <DelegatePageHeader delegateCount={delegates?.count ?? 0} />

      {isError ? (
        <div className="mt-sp-8">
          <ErrorState
            title="Couldn't load delegates"
            message="The API may be unavailable. Please try again."
            onRetry={() => refetch()}
          />
        </div>
      ) : (
        <div className="mt-sp-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sp-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-r16 border border-border p-6 space-y-sp-4">
                  <div className="flex items-center gap-sp-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-sp-2 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            : delegates?.delegates.length === 0
              ? (
                <div className="col-span-full">
                  <EmptyState
                    title="No active delegates"
                    message="There are no active delegates at the moment. Check back later."
                  />
                </div>
              )
              : delegates?.delegates.map((address) => (
                  <DelegateCard
                    key={address}
                    address={address}
                    profile={profiles?.get(address.toLowerCase())}
                    isCurrentDelegate={
                      eligibility?.delegatedTo?.toLowerCase() ===
                      address.toLowerCase()
                    }
                    onDelegate={handleDelegate}
                  />
                ))}
        </div>
      )}
    </PageContainer>
  );
}
