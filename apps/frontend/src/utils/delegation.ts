export function getAnticaptureDelegateUrl(address: string): string {
  return `https://anticapture.com/ens/holders-and-delegates?tab=delegates&drawerAddress=${encodeURIComponent(address)}`
}
