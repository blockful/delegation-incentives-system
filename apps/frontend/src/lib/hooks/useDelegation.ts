"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ENS_TOKEN_ADDRESS, ENS_TOKEN_ABI } from "@/lib/constants";

export function useDelegation() {
  const {
    writeContract,
    data: hash,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isConfirmError,
  } = useWaitForTransactionReceipt({ hash });

  const delegate = (delegatee: string) => {
    writeContract({
      address: ENS_TOKEN_ADDRESS,
      abi: ENS_TOKEN_ABI,
      functionName: "delegate",
      args: [delegatee as `0x${string}`],
    });
  };

  return {
    delegate,
    hash,
    isPending: isWritePending || isConfirming,
    isSuccess,
    isError: isWriteError || isConfirmError,
    error: writeError,
    reset,
  };
}
