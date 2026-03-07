interface DelegatePageHeaderProps {
  delegateCount: number;
}

export function DelegatePageHeader({ delegateCount }: DelegatePageHeaderProps) {
  return (
    <div className="space-y-sp-4">
      <span className="text-label uppercase text-text-muted tracking-wider">
        Delegate Your Tokens
      </span>
      <h1 className="text-h1 md:text-display text-text-primary">
        Delegate to someone who shows up
      </h1>
      <p className="text-body text-text-body max-w-xl">
        These delegates actively participate in ENS governance. Delegate to one
        and start earning rewards.
      </p>
      <div className="flex flex-wrap gap-sp-6 pt-sp-2">
        <div>
          <span className="text-h3 text-text-primary">{delegateCount}</span>
          <span className="text-body-sm text-text-muted ml-sp-1">
            active delegates
          </span>
        </div>
      </div>
    </div>
  );
}
