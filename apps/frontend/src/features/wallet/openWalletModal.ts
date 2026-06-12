/**
 * Opens the Reown AppKit wallet-connect modal.
 *
 * The AppKit provider module is imported lazily so the wallet SDK stays out
 * of the initial bundle (same pattern the Header used before this was
 * extracted). Use this anywhere a user action requires a connected wallet —
 * e.g. clicking "Delegate now" while disconnected.
 */
export async function openWalletModal() {
  const { appKit } = await import('@/app/providers/AppKitProvider')
  appKit.open()
}
