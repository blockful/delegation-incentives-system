"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const connected = mounted && account && chain;

        return (
          <div
            {...(!mounted && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none" as const,
                userSelect: "none" as const,
              },
            })}
          >
            {!connected ? (
              <Button variant="pill" onClick={openConnectModal}>
                Connect
              </Button>
            ) : chain.unsupported ? (
              <Button
                variant="pill"
                onClick={openChainModal}
                className="bg-warning"
              >
                Wrong network
              </Button>
            ) : (
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 h-9 px-3 rounded-rFull border border-border bg-white hover:bg-surface transition-colors"
              >
                {account.ensAvatar && (
                  <img
                    src={account.ensAvatar}
                    alt=""
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="text-body-sm font-bold text-text-primary">
                  {account.ensName || account.displayName}
                </span>
              </button>
            )}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
