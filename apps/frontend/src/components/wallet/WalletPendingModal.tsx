"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/format";

interface WalletPendingModalProps {
  open: boolean;
  onClose: () => void;
  delegateAddress: string;
  delegateName?: string | null;
}

export function WalletPendingModal({
  open,
  onClose,
  delegateAddress,
  delegateName,
}: WalletPendingModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center py-sp-4">
        {/* Spinner */}
        <div className="w-16 h-16 rounded-full border-4 border-surface border-t-primary animate-spin mb-sp-6" />

        <h3 className="text-h2 text-text-primary">
          Waiting for wallet confirmation
        </h3>
        <p className="mt-sp-3 text-body-sm text-text-body">
          Confirm the delegation transaction in your wallet
        </p>

        <div className="mt-sp-5 px-4 py-3 rounded-r10 bg-surface w-full">
          <span className="text-label uppercase text-text-muted tracking-wider block">
            Delegating to
          </span>
          <span className="text-h3 text-text-primary mt-1 block">
            {delegateName || truncateAddress(delegateAddress)}
          </span>
          <span className="text-body-sm text-text-muted block">
            {truncateAddress(delegateAddress)}
          </span>
        </div>

        <Button
          variant="ghost"
          className="mt-sp-6"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
