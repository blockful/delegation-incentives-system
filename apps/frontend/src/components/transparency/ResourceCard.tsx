import { Card } from "@/components/ui/Card";

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

export function ResourceCard({
  icon,
  title,
  description,
  href,
}: ResourceCardProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="h-full hover:border-primary/30 transition-colors space-y-sp-3">
        <span className="text-primary">{icon}</span>
        <h3 className="text-h3 text-text-primary">{title}</h3>
        <p className="text-body-sm text-text-body">{description}</p>
        <span className="text-body-sm text-primary font-bold">
          View &rarr;
        </span>
      </Card>
    </a>
  );
}
