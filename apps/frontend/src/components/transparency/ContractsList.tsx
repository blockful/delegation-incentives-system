import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { truncateAddress } from "@/lib/format";

const contracts = [
  {
    name: "ENS Token",
    address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
    description: "ERC-20 governance token with delegation support",
  },
  {
    name: "ENS Governor",
    address: "0x323A76393544d5ecca80cd6ef2A560C6a395b7E3",
    description: "On-chain governance and proposal execution",
  },
  {
    name: "Reward Distributor",
    address: "0x0000000000000000000000000000000000000000",
    description: "Monthly reward distribution contract (TBD)",
  },
];

export function ContractsList() {
  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Contracts
      </span>

      <div className="space-y-sp-3">
        {contracts.map((contract) => (
          <Card key={contract.name} className="flex items-center justify-between gap-sp-4">
            <div className="min-w-0">
              <div className="flex items-center gap-sp-2">
                <span className="text-body font-bold text-text-primary">
                  {contract.name}
                </span>
                <Badge variant="active">Verified</Badge>
              </div>
              <p className="text-body-sm text-text-body mt-sp-1">
                {contract.description}
              </p>
            </div>
            <a
              href={`https://etherscan.io/address/${contract.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-caption text-primary hover:underline font-bold"
            >
              {truncateAddress(contract.address)}
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
