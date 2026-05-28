export interface WalrusUploadResult {
  blobId: string;
  objectId?: string;
  startEpoch?: number;
  endEpoch?: number;
  cost?: number;
  raw: unknown;
}

export interface WalrusRenewResult {
  objectId: string;
  endEpoch?: number;
  raw: unknown;
}

const DEFAULT_TESTNET_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const DEFAULT_TESTNET_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const DEFAULT_MAINNET_PUBLISHER = 'https://publisher.walrus-mainnet.walrus.space';
const DEFAULT_MAINNET_AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';

export function getDefaultWalrusEpochs(): number {
  const parsed = Number(process.env.WALRUS_DEFAULT_EPOCHS ?? '2');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 2;
}

export function getWalrusNetwork(): 'testnet' | 'mainnet' {
  return process.env.WALRUS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getWalrusPublisherUrl(): string {
  const configured = process.env.WALRUS_PUBLISHER_URL;
  if (configured) return configured.replace(/\/$/, '');
  return getWalrusNetwork() === 'mainnet' ? DEFAULT_MAINNET_PUBLISHER : DEFAULT_TESTNET_PUBLISHER;
}

export function getWalrusAggregatorUrl(): string {
  const configured = process.env.WALRUS_AGGREGATOR_URL;
  if (configured) return configured.replace(/\/$/, '');
  return getWalrusNetwork() === 'mainnet' ? DEFAULT_MAINNET_AGGREGATOR : DEFAULT_TESTNET_AGGREGATOR;
}

export async function uploadWalrusBlob(
  bytes: Uint8Array,
  options: { epochs?: number; deletable?: boolean } = {},
): Promise<WalrusUploadResult> {
  const epochs = options.epochs ?? getDefaultWalrusEpochs();
  const url = new URL('/v1/blobs', getWalrusPublisherUrl());
  url.searchParams.set('epochs', String(epochs));
  url.searchParams.set(options.deletable ? 'deletable' : 'permanent', 'true');

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Walrus upload failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return normalizeUploadResponse(body);
}

export async function downloadWalrusBlob(blobId: string, objectId?: string): Promise<ArrayBuffer> {
  const blobUrl = new URL(`/v1/blobs/${encodeURIComponent(blobId)}`, getWalrusAggregatorUrl());
  const blobResponse = await fetch(blobUrl);
  if (blobResponse.ok) {
    return blobResponse.arrayBuffer();
  }

  if (objectId) {
    const objectUrl = new URL(`/v1/blobs/by-object-id/${encodeURIComponent(objectId)}`, getWalrusAggregatorUrl());
    const objectResponse = await fetch(objectUrl);
    if (objectResponse.ok) {
      return objectResponse.arrayBuffer();
    }

    throw new Error(`Walrus download failed (${blobResponse.status} by blob ID, ${objectResponse.status} by object ID).`);
  }

  throw new Error(`Walrus download failed (${blobResponse.status}).`);
}

export async function checkWalrusBlobAvailable(blobId: string, objectId?: string): Promise<boolean> {
  const blobUrl = new URL(`/v1/blobs/${encodeURIComponent(blobId)}`, getWalrusAggregatorUrl());
  const blobResponse = await fetch(blobUrl);
  if (blobResponse.ok) {
    await blobResponse.body?.cancel();
    return true;
  }

  if (!objectId) return false;

  const objectUrl = new URL(`/v1/blobs/by-object-id/${encodeURIComponent(objectId)}`, getWalrusAggregatorUrl());
  const objectResponse = await fetch(objectUrl);
  if (objectResponse.ok) {
    await objectResponse.body?.cancel();
    return true;
  }

  return false;
}

export async function waitForWalrusBlob(
  blobId: string,
  objectId?: string,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<void> {
  const attempts = options.attempts ?? 6;
  const delayMs = options.delayMs ?? 2_000;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await downloadWalrusBlob(blobId, objectId);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Walrus blob was not readable after upload.');
}

export async function renewWalrusBlob(
  objectId: string,
  options: { epochs?: number } = {},
): Promise<WalrusRenewResult> {
  const renewUrl = process.env.WALRUS_RENEW_URL;
  if (!renewUrl) {
    throw new Error(
      'Walrus renewal executor is not configured. Set WALRUS_RENEW_URL to a backend worker that runs `walrus extend` with the sponsor wallet.',
    );
  }

  const response = await fetch(renewUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      objectId,
      epochs: options.epochs ?? getDefaultWalrusEpochs(),
      network: getWalrusNetwork(),
    }),
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Walrus renewal failed (${response.status}): ${JSON.stringify(body)}`);
  }

  const endEpoch = readNumber(body, ['endEpoch']) ?? readNumber(body, ['end_epoch']);
  return { objectId, endEpoch, raw: body };
}

function normalizeUploadResponse(body: unknown): WalrusUploadResult {
  const newlyCreated = readObject(body, ['newlyCreated']);
  const blobObject = readObject(newlyCreated, ['blobObject']);
  const storage = readObject(blobObject, ['storage']);
  const alreadyCertified = readObject(body, ['alreadyCertified']);

  const blobId =
    readString(blobObject, ['blobId']) ??
    readString(alreadyCertified, ['blobId']) ??
    readString(body, ['blobId']);
  if (!blobId) {
    throw new Error(`Walrus upload response did not include a blobId: ${JSON.stringify(body)}`);
  }

  return {
    blobId,
    objectId: readString(blobObject, ['id']) ?? readString(body, ['objectId']),
    startEpoch: readNumber(storage, ['startEpoch']) ?? readNumber(storage, ['start_epoch']),
    endEpoch:
      readNumber(storage, ['endEpoch']) ??
      readNumber(storage, ['end_epoch']) ??
      readNumber(alreadyCertified, ['endEpoch']) ??
      readNumber(body, ['endEpoch']),
    cost: readNumber(newlyCreated, ['cost']) ?? readNumber(body, ['cost']),
    raw: body,
  };
}

function readObject(value: unknown, path: string[]): Record<string, unknown> | undefined {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current && typeof current === 'object' ? (current as Record<string, unknown>) : undefined;
}

function readString(value: unknown, path: string[]): string | undefined {
  const object = path.length > 1 ? readObject(value, path.slice(0, -1)) : value;
  const raw =
    object && typeof object === 'object' ? (object as Record<string, unknown>)[path[path.length - 1]] : undefined;
  return typeof raw === 'string' ? raw : undefined;
}

function readNumber(value: unknown, path: string[]): number | undefined {
  const object = path.length > 1 ? readObject(value, path.slice(0, -1)) : value;
  const raw =
    object && typeof object === 'object' ? (object as Record<string, unknown>)[path[path.length - 1]] : undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
