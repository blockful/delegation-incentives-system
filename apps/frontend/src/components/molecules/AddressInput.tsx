import { type FormEvent, useState } from "react";
import { Button, Input } from "@/components/atoms";
import { space } from "@/theme";
import type { CSSProperties } from "react";

export interface AddressInputProps {
  onSubmit: (address: string) => void;
  loading?: boolean;
  placeholder?: string;
}

const formStyle: CSSProperties = {
  display: "flex",
  gap: space["3"],
  alignItems: "flex-end",
};

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function AddressInput({
  onSubmit,
  loading,
  placeholder = "0x...",
}: AddressInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!ETH_ADDRESS_RE.test(trimmed)) {
      setError("Enter a valid Ethereum address");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ flex: 1 }}>
        <Input
          label="Ethereum Address"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          error={error}
          data-testid="address-input"
        />
      </div>
      <Button type="submit" disabled={loading} data-testid="address-submit">
        {loading ? "Checking..." : "Check"}
      </Button>
    </form>
  );
}
