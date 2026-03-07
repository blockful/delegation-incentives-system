"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DelegationSuccessOverlayProps {
  open: boolean;
  onClose: () => void;
  delegateName: string;
}

export function DelegationSuccessOverlay({
  open,
  onClose,
  delegateName,
}: DelegationSuccessOverlayProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, router]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center py-sp-6">
        {/* Success checkmark */}
        <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-sp-6">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M9 16l5 5 9-9"
              stroke="#1A7F37"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="text-h2 text-text-primary">
          You&apos;re now delegated to {delegateName}
        </h3>
        <p className="mt-sp-3 text-body-sm text-text-body">
          Earning starts at the next round. Redirecting to your dashboard
          in {countdown}s...
        </p>

        <Button
          variant="primary"
          className="mt-sp-6 w-full"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </Button>
      </div>
    </Modal>
  );
}
