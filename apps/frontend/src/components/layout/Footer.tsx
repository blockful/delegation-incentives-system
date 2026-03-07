import Link from "next/link";

const NAV_LINKS = [
  { href: "/delegates", label: "Delegates" },
  { href: "/rounds", label: "Rounds" },
  { href: "/lottery", label: "Lottery" },
  { href: "/transparency", label: "Transparency" },
];

const EXTERNAL_LINKS = [
  { href: "https://discuss.ens.domains", label: "ENS Forum" },
  { href: "https://github.com/blockful-io", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Branding */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">ENS</span>
              </div>
              <span className="font-bold text-text-primary">
                Incentives Pilot v1
              </span>
            </div>
            <p className="text-body-sm text-text-body max-w-xs">
              Earn rewards for delegating your ENS tokens and strengthening
              governance participation.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-label uppercase text-text-muted tracking-wider">
              Navigation
            </h4>
            <div className="space-y-2">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-body-sm text-text-body hover:text-text-primary transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* External */}
          <div className="space-y-3">
            <h4 className="text-label uppercase text-text-muted tracking-wider">
              Resources
            </h4>
            <div className="space-y-2">
              {EXTERNAL_LINKS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-body-sm text-text-body hover:text-text-primary transition-colors"
                >
                  {label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3.5 8.5l5-5M4.5 3.5h4v4" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 text-caption text-text-muted">
          Built by Blockful · Powered by Anticapture
        </div>
      </div>
    </footer>
  );
}
