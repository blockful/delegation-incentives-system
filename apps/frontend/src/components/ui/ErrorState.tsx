import { Button } from "./Button";
import { Card } from "./Card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load the data. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="text-center py-sp-12">
      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-sp-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z"
            stroke="#CF6B00"
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
      {onRetry && (
        <div className="mt-sp-4">
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
}
