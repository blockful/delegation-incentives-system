"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { truncateAddress } from "@/lib/format";
import type { EnsProfile } from "@/lib/hooks/useEnsProfiles";

interface DelegateCardProps {
  address: string;
  profile?: EnsProfile;
  isCurrentDelegate?: boolean;
  onDelegate?: (address: string) => void;
}

export function DelegateCard({
  address,
  profile,
  isCurrentDelegate,
  onDelegate,
}: DelegateCardProps) {
  const displayName = profile?.name || truncateAddress(address);
  const avatar = profile?.avatar;

  return (
    <Card variant="default" className="flex flex-col gap-sp-4">
      <div className="flex items-center gap-sp-3">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sp-2">
            <span className="font-bold text-text-primary truncate">
              {displayName}
            </span>
            <Badge variant="active">Active</Badge>
          </div>
          <span className="text-body-sm text-text-muted">
            {truncateAddress(address)}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {isCurrentDelegate ? (
        <Button variant="secondary" disabled className="w-full">
          Delegated &#10003;
        </Button>
      ) : (
        <Button
          variant="primary-md"
          className="w-full"
          onClick={() => onDelegate?.(address)}
        >
          Delegate
        </Button>
      )}
    </Card>
  );
}
