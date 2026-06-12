export const ENS_SUBGRAPH_ID = "5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH";

/** Mainnet ENS registry (same on all EVM chains that mirror ENS). */
export const ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

export const publicResolverAbi = [
  {
    inputs: [
      { internalType: "bytes32", name: "node", type: "bytes32" },
      { internalType: "bytes", name: "hash", type: "bytes" },
    ],
    name: "setContenthash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/** Minimal ENS registry ABI — just enough for preflight ownership checks. */
export const ensRegistryAbi = [
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "node", type: "bytes32" }],
    name: "resolver",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** ERC-165 supportsInterface — used to check if a resolver supports setContenthash. */
export const erc165Abi = [
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * The ERC-165 interface ID for the contenthash resolver profile.
 * keccak256("contenthash(bytes32)") XOR keccak256("setContenthash(bytes32,bytes)")
 * = 0xbc1c58d1
 */
export const CONTENTHASH_INTERFACE_ID = "0xbc1c58d1" as const;

export function getEnsSubgraphUrl() {
  const explicit = process.env.ENS_SUBGRAPH_URL;
  if (explicit) return explicit;

  if (!process.env.THE_GRAPH_API_KEY) return null;
  return `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/${ENS_SUBGRAPH_ID}`;
}

export function getEthLimoUrl(name: string) {
  return `https://${name}.limo`;
}

export function getEtherscanTxUrl(txHash: string) {
  return `https://etherscan.io/tx/${txHash}`;
}
