/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveShardLockAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(__dirname, '..', 'src', request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const {
  createGuardianEncryptionIdentity,
} = require('../src/lib/crypto/shardlock.ts');
const {
  createShardLockVault,
  recoverShardLockVault,
} = require('../src/lib/crypto/vault.ts');
const {
  MemoryShardLockStorageAdapter,
} = require('../src/lib/store/shardlock-store.ts');

const wallets = [
  '0x1000000000000000000000000000000000000001',
  '0x2000000000000000000000000000000000000002',
  '0x3000000000000000000000000000000000000003',
  '0x4000000000000000000000000000000000000004',
];

async function main() {
  await verifiesTextRecovery();
  await verifiesFileMetadataProtection();
  await rejectsInsufficientShares();
  await rejectsWrongGuardian();
  await rejectsTamperedCiphertext();
  console.log('ShardLock verification passed.');
}

async function makeGuardians(count = 3) {
  const guardians = [];
  for (let index = 0; index < count; index += 1) {
    guardians.push(await createGuardianEncryptionIdentity(
      wallets[index],
      async (message) => fakeSignature(message, index),
    ));
  }
  return guardians;
}

async function verifiesTextRecovery() {
  const storage = new MemoryShardLockStorageAdapter();
  const guardians = await makeGuardians();
  const secret = 'velvet canyon orbit lantern maple thunder';
  const artifact = await createShardLockVault({
    payload: secret,
    ownerWallet: wallets[3],
    guardianIdentities: guardians,
    threshold: 2,
    storageAdapter: storage,
  });

  const recovered = await recoverShardLockVault({
    vaultId: artifact.id,
    guardianPrivateIdentity: guardians.slice(0, 2),
    selectedShardRefs: artifact.shardRefs.slice(0, 2),
    storageAdapter: storage,
  });

  assert(new TextDecoder().decode(recovered) === secret, 'text recovery should match original payload');
  assertNoPlaintext(storage.dumpSerializableState(), [secret]);
}

async function verifiesFileMetadataProtection() {
  const storage = new MemoryShardLockStorageAdapter();
  const guardians = await makeGuardians();
  const fileSecret = JSON.stringify({
    type: 'walrus-file',
    blobId: 'blob-secret-check',
    fileName: 'recovery.pdf',
    fileSize: 2048,
    mimeType: 'application/pdf',
    encryptionKey: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    iv: '0xabcdefabcdefabcdefabcdef',
    renewalMode: 'notify',
  });
  const artifact = await createShardLockVault({
    payload: fileSecret,
    ownerWallet: wallets[3],
    guardianIdentities: guardians,
    threshold: 2,
    contentType: 'walrus-file',
    storageAdapter: storage,
  });

  assertNoPlaintext(storage.dumpSerializableState(), [
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    'recovery.pdf',
  ]);

  const recovered = await recoverShardLockVault({
    vaultId: artifact.id,
    guardianPrivateIdentity: guardians.slice(1, 3),
    selectedShardRefs: artifact.shardRefs.slice(1, 3),
    storageAdapter: storage,
  });
  assert(new TextDecoder().decode(recovered) === fileSecret, 'file metadata recovery should match original payload');
}

async function rejectsInsufficientShares() {
  const storage = new MemoryShardLockStorageAdapter();
  const guardians = await makeGuardians();
  const artifact = await createShardLockVault({
    payload: 'threshold secret',
    ownerWallet: wallets[3],
    guardianIdentities: guardians,
    threshold: 2,
    storageAdapter: storage,
  });

  await assertRejects(
    () => recoverShardLockVault({
      vaultId: artifact.id,
      guardianPrivateIdentity: guardians[0],
      selectedShardRefs: artifact.shardRefs.slice(0, 1),
      storageAdapter: storage,
    }),
    'insufficient shares should fail',
  );
}

async function rejectsWrongGuardian() {
  const storage = new MemoryShardLockStorageAdapter();
  const guardians = await makeGuardians();
  const wrongGuardian = await createGuardianEncryptionIdentity(
    '0x5000000000000000000000000000000000000005',
    async (message) => fakeSignature(message, 5),
  );
  const artifact = await createShardLockVault({
    payload: 'wrong guardian secret',
    ownerWallet: wallets[3],
    guardianIdentities: guardians,
    threshold: 2,
    storageAdapter: storage,
  });

  await assertRejects(
    () => recoverShardLockVault({
      vaultId: artifact.id,
      guardianPrivateIdentity: [wrongGuardian, guardians[1]],
      selectedShardRefs: artifact.shardRefs.slice(0, 2),
      storageAdapter: storage,
    }),
    'wrong guardian should fail',
  );
}

async function rejectsTamperedCiphertext() {
  const storage = new MemoryShardLockStorageAdapter();
  const guardians = await makeGuardians();
  const artifact = await createShardLockVault({
    payload: 'tamper secret',
    ownerWallet: wallets[3],
    guardianIdentities: guardians,
    threshold: 2,
    storageAdapter: storage,
  });
  const tampered = {
    ...artifact,
    payload: {
      ...artifact.payload,
      ciphertext: artifact.payload.ciphertext.replace(/.$/, artifact.payload.ciphertext.endsWith('A') ? 'B' : 'A'),
    },
  };
  await storage.saveVaultArtifact(tampered);

  await assertRejects(
    () => recoverShardLockVault({
      vaultId: artifact.id,
      guardianPrivateIdentity: guardians.slice(0, 2),
      selectedShardRefs: artifact.shardRefs.slice(0, 2),
      storageAdapter: storage,
    }),
    'tampered ciphertext should fail',
  );
}

function fakeSignature(message, index) {
  const bytes = new TextEncoder().encode(`${index}:${message}`);
  const hex = Array.from(bytes)
    .slice(0, 64)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .padEnd(128, '0');
  return `0x${hex}`;
}

function assertNoPlaintext(value, forbidden) {
  const serialized = JSON.stringify(value);
  for (const text of forbidden) {
    assert(!serialized.includes(text), `storage should not include plaintext: ${text}`);
  }
}

async function assertRejects(action, message) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
