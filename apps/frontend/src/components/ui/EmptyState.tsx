import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <Card className="text-center py-sp-12">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-sp-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z"
            stroke="#8C959F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="text-h3 text-text-primary">{title}</h3>
      <p className="text-body-sm text-text-body mt-sp-2 max-w-sm mx-auto">
        {message}
      </p>
      {action && <div className="mt-sp-4">{action}</div>}
    </Card>
  );
}
