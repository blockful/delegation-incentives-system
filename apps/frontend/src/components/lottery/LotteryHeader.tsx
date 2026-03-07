export function LotteryHeader() {
  return (
    <div>
      <span className="text-label uppercase text-text-muted tracking-wider">
        Monthly Lottery
      </span>
      <h1 className="mt-sp-4 text-display md:text-[48px] md:leading-[52px] text-text-primary">
        Small balance? You still have a shot.
      </h1>
      <p className="mt-sp-4 text-body text-text-body max-w-lg">
        Delegators who earn less than 1 ENS per round are pooled together for a
        monthly lottery draw. Each pool accumulates ~10 ENS and one random winner
        takes it all.
      </p>
    </div>
  );
}
