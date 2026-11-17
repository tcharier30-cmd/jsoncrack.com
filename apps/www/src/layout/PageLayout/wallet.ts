export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

export const getProvider = (): EthereumProvider | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
};

/** Switches the wallet to the given chain, adding it first if the wallet doesn't know it. */
export const switchChain = async (
  provider: EthereumProvider,
  chain: { chainId: string; [key: string]: unknown }
) => {
  const current: string = await provider.request({ method: "eth_chainId" });
  if (current.toLowerCase() === chain.chainId.toLowerCase()) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.chainId }],
    });
  } catch (error: any) {
    // 4902: chain not added to the wallet yet
    if (error?.code !== 4902 || Object.keys(chain).length === 1) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [chain] });
  }
};
