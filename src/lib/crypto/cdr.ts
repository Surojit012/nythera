import { CDRClient, initWasm, uuidToLabel } from '@piplabs/cdr-sdk';
import { cdrAbi, contractAddresses } from '@piplabs/cdr-contracts';
import { BaseError, encodeAbiParameters, toHex, type PublicClient, type WalletClient } from 'viem';
import { WHITELIST_CONDITION, whitelistConditionAbi } from '@/lib/contracts';
import type { AccessConditionVersion } from '@/lib/contracts';

let wasmReady = false;

export interface CDRClientConfig {
  network: 'testnet' | 'mainnet';
  apiUrl: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
  minThresholdRatio?: number;
}

export interface CDRSecretUploadParams {
  client: CDRClient;
  publicClient: PublicClient;
  walletClient: WalletClient;
  ownerAddress: `0x${string}`;
  secret: string;
  recipientAddresses: `0x${string}`[];
  accessAuxData?: `0x${string}`;
  updatable?: boolean;
  whitelistConditionAddress?: `0x${string}`;
  accessConditionAddress?: `0x${string}`;
  accessConditionVersion?: AccessConditionVersion;
  onProgress?: (stage: 'allocating' | 'registering' | 'encrypting' | 'writing') => void;
}

export interface CDRSecretAccessParams {
  client: CDRClient;
  uuid: number;
  accessAuxData?: `0x${string}`;
  timeoutMs?: number;
}

export async function createCDRClient(config: CDRClientConfig): Promise<CDRClient> {
  if (!wasmReady) {
    await initWasm();
    wasmReady = true;
  }

  return new CDRClient({
    network: config.network,
    apiUrl: config.apiUrl,
    publicClient: config.publicClient,
    walletClient: config.walletClient,
    minThresholdRatio: config.minThresholdRatio,
  });
}

export async function uploadSecretToCDR({
  client,
  publicClient,
  walletClient,
  ownerAddress,
  secret,
  recipientAddresses,
  accessAuxData = '0x',
  updatable = false,
  whitelistConditionAddress = WHITELIST_CONDITION,
  accessConditionAddress,
  accessConditionVersion,
  onProgress,
}: CDRSecretUploadParams): Promise<{
  uuid: number;
  txHashes: { allocate: `0x${string}`; write: `0x${string}` };
  access: {
    conditionVersion: AccessConditionVersion;
    conditionAddress: `0x${string}`;
    readConditionData: `0x${string}`;
    writeConditionData: `0x${string}`;
    accessAuxData: `0x${string}`;
  };
}> {
  if (!accessConditionAddress && !whitelistConditionAddress) {
    throw new Error('NEXT_PUBLIC_WHITELIST_CONDITION is required for vault creation.');
  }

  const initialWhitelist = Array.from(
    new Set([ownerAddress, ...recipientAddresses].map((address) => address.toLowerCase())),
  ) as `0x${string}`[];
  const initialReaders = initialWhitelist.filter(
    (address) => address.toLowerCase() !== ownerAddress.toLowerCase(),
  );
  const conditionVersion: AccessConditionVersion = accessConditionAddress
    ? accessConditionVersion ?? 'v2-encoded-access'
    : 'v1-storage-whitelist';
  const conditionAddress = accessConditionAddress || whitelistConditionAddress;
  const conditionData = accessConditionAddress
    ? encodeAbiParameters(
      [{ type: 'address' }, { type: 'address[]' }],
      [ownerAddress, initialReaders],
    )
    : '0x';

  onProgress?.('allocating');
  const { uuid, txHash: allocateTx } = await client.uploader.allocate({
    updatable,
    writeConditionAddr: conditionAddress,
    readConditionAddr: conditionAddress,
    writeConditionData: conditionData,
    readConditionData: conditionData,
    skipConditionValidation: !accessConditionAddress,
  });

  if (!accessConditionAddress) {
    onProgress?.('registering');
    const registerTx = await walletClient.writeContract({
      address: whitelistConditionAddress,
      abi: whitelistConditionAbi,
      functionName: 'registerWithInitial',
      args: [uuid, initialWhitelist],
      account: ownerAddress,
      chain: undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash: registerTx });
  }

  onProgress?.('encrypting');
  const globalPubKey = await client.observer.getGlobalPubKey();
  const ciphertext = await client.uploader.encryptDataKey({
    dataKey: new TextEncoder().encode(secret),
    globalPubKey,
    label: uuidToLabel(uuid),
  });

  onProgress?.('writing');
  const encryptedData = toHex(ciphertext.raw);
  const cdrAddress = contractAddresses.testnet.cdr;
  const writeFee = await publicClient.readContract({
    address: cdrAddress,
    abi: cdrAbi,
    functionName: 'writeFee',
  });

  try {
    await publicClient.simulateContract({
      address: cdrAddress,
      abi: cdrAbi,
      functionName: 'write',
      args: [uuid, accessAuxData, encryptedData],
      account: ownerAddress,
      value: writeFee,
    });
  } catch (error) {
    throw new Error(
      `Couldn't save to blockchain - try again. Vault ID ${uuid}: ${formatContractError(error)}`,
    );
  }

  const { txHash: writeTx } = await client.uploader.write({
    uuid,
    encryptedData,
    accessAuxData,
  });
  const writeReceipt = await publicClient.waitForTransactionReceipt({ hash: writeTx });
  if (writeReceipt.status !== 'success') {
    throw new Error(`Couldn't save to blockchain - try again. Vault ID ${uuid}. Transaction hash: ${writeTx}`);
  }

  return {
    uuid,
    txHashes: {
      allocate: allocateTx,
      write: writeTx,
    },
    access: {
      conditionVersion,
      conditionAddress,
      readConditionData: conditionData,
      writeConditionData: conditionData,
      accessAuxData,
    },
  };
}

export async function accessSecretFromCDR({
  client,
  uuid,
  accessAuxData = '0x',
  timeoutMs = 120_000,
}: CDRSecretAccessParams): Promise<string> {
  const { dataKey } = await client.consumer.accessCDR({
    uuid,
    accessAuxData,
    timeoutMs,
  });

  return new TextDecoder().decode(dataKey);
}

function formatContractError(error: unknown): string {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }

  return error instanceof Error ? error.message : 'Unknown blockchain save failure.';
}
