export const WHITELIST_CONDITION =
  (process.env.NEXT_PUBLIC_WHITELIST_CONDITION ?? '') as `0x${string}`;

export const ACCESS_CONDITION_V2 =
  (process.env.NEXT_PUBLIC_ACCESS_CONDITION_V2 ?? '') as `0x${string}`;

export const ACCESS_CONDITION_V3 =
  (process.env.NEXT_PUBLIC_ACCESS_CONDITION_V3 ?? '') as `0x${string}`;

export const ACTIVE_ACCESS_CONDITION = '' as `0x${string}`;

export type AccessConditionVersion = 'v1-storage-whitelist' | 'v2-encoded-access' | 'v3-origin-access';

export const whitelistConditionAbi = [
  {
    type: 'function',
    name: 'registerWithInitial',
    inputs: [
      { name: 'uuid', type: 'uint32' },
      { name: 'initial', type: 'address[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'addToWhitelist',
    inputs: [
      { name: 'uuid', type: 'uint32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeFromWhitelist',
    inputs: [
      { name: 'uuid', type: 'uint32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isWhitelisted',
    inputs: [
      { name: 'uuid', type: 'uint32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'vaultCreator',
    inputs: [{ name: 'uuid', type: 'uint32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

export const encodedAccessConditionAbi = [
  {
    type: 'function',
    name: 'setAccessOverride',
    inputs: [
      { name: 'conditionData', type: 'bytes' },
      { name: 'account', type: 'address' },
      { name: 'allowed', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkReadCondition',
    inputs: [
      { name: 'caller', type: 'address' },
      { name: 'conditionData', type: 'bytes' },
      { name: 'accessAuxData', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'checkWriteCondition',
    inputs: [
      { name: 'caller', type: 'address' },
      { name: 'conditionData', type: 'bytes' },
      { name: 'accessAuxData', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAccessOverride',
    inputs: [
      { name: 'conditionData', type: 'bytes' },
      { name: 'account', type: 'address' },
    ],
    outputs: [
      { name: 'set', type: 'bool' },
      { name: 'allowed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
] as const;

export const accessConditionV2Abi = encodedAccessConditionAbi;
