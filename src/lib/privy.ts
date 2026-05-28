import { createWalletClient, custom } from 'viem';
import { storyAeneid } from './wagmi';

type PrivyWalletLike = {
  address: string;
  switchChain?: (chainId: number) => Promise<void>;
  getEthereumProvider: () => Promise<unknown>;
};

export async function createPrivyWalletClient(wallet: PrivyWalletLike) {
  if (wallet.switchChain) {
    await wallet.switchChain(storyAeneid.id);
  }

  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    chain: storyAeneid,
    transport: custom(provider as Parameters<typeof custom>[0]),
    account: wallet.address as `0x${string}`,
  });
}
