import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function FooterCTA() {
  return (
    <section className="py-sp-16 md:py-[96px] text-center">
      <div className="max-w-xl mx-auto">
        <h2 className="text-h1 md:text-display text-text-primary">
          Earn ENS rewards. Strengthen governance.
        </h2>
        <p className="mt-sp-4 text-body text-text-body">
          Join thousands of token holders earning passive rewards while
          supporting active ENS governance.
        </p>
        <div className="mt-sp-8 flex flex-wrap justify-center gap-sp-3">
          <Link href="/delegates">
            <Button variant="primary">Delegate Now &rarr;</Button>
          </Link>
          <Link href="/transparency">
            <Button variant="secondary">Learn More</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
