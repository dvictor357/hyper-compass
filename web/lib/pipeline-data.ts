import type { GraphNode, GraphLink } from './types';

export interface PipelineToken {
  symbol: string;
  chain: string;
  alphaScore: number;
  volume24h: number;
  smartMoneyNetFlow: number;
  priceChange: number;
  marketCap: number;
  buySellRatio: number;
  riskGrade: string;
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendation: string;
  conviction: number;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  pass: boolean;
}

export interface WhaleProfile {
  address: string;
  chain: string;
  relatedWallets: number;
  counterparties: number;
}

export interface CoordinationCluster {
  hub: string;
  chain: string;
  connectedWallets: number;
  sharedTokens: string;
  clusterScore: number;
}

export interface PipelineMetrics {
  totalCalls: number;
  uniqueEndpoints: number;
  chainsCovered: string;
  tokensScanned: number;
  whalesProfiled: number;
  coordinationClusters: number;
  avgLatency: string;
  pipelineDuration: string;
  generatedAt: string;
}

export function getPipelineTokens(): PipelineToken[] {
  return [
    {
      symbol: 'PLAY', chain: 'base', alphaScore: 40.0, volume24h: 899200,
      smartMoneyNetFlow: -55300, priceChange: 26.88, marketCap: 32670000,
      buySellRatio: 0.88, riskGrade: 'C', riskScore: 6.3, conviction: 40.0,
      recommendation: 'WATCH',
      riskFactors: [
        { name: 'Market Cap', score: 6.0, weight: 15, pass: true },
        { name: 'Liquidity', score: 3.0, weight: 15, pass: false },
        { name: 'Buy/Sell Ratio', score: 6.0, weight: 10, pass: true },
        { name: 'SM Flow', score: 2.0, weight: 20, pass: false },
        { name: 'Whale Backing', score: 10.0, weight: 15, pass: true },
        { name: 'Coordination', score: 10.0, weight: 10, pass: true },
        { name: 'Momentum', score: 10.0, weight: 10, pass: true },
        { name: 'Distribution', score: 8.0, weight: 5, pass: true },
      ],
    },
    {
      symbol: 'JLP', chain: 'solana', alphaScore: 35.7, volume24h: 20620000,
      smartMoneyNetFlow: 13660000, priceChange: -1.20, marketCap: 935420000,
      buySellRatio: 4.93, riskGrade: 'A', riskScore: 8.5, conviction: 35.7,
      recommendation: 'WATCH',
      riskFactors: [
        { name: 'Market Cap', score: 10.0, weight: 15, pass: true },
        { name: 'Liquidity', score: 10.0, weight: 15, pass: true },
        { name: 'Buy/Sell Ratio', score: 10.0, weight: 10, pass: true },
        { name: 'SM Flow', score: 10.0, weight: 20, pass: true },
        { name: 'Whale Backing', score: 6.0, weight: 15, pass: true },
        { name: 'Coordination', score: 6.0, weight: 10, pass: true },
        { name: 'Momentum', score: 6.0, weight: 10, pass: true },
        { name: 'Distribution', score: 8.0, weight: 5, pass: true },
      ],
    },
    {
      symbol: 'WSTETH', chain: 'base', alphaScore: 35.2, volume24h: 7070000,
      smartMoneyNetFlow: 4470000, priceChange: -1.10, marketCap: 170720000,
      buySellRatio: 4.44, riskGrade: 'A', riskScore: 8.8, conviction: 35.2,
      recommendation: 'WATCH',
      riskFactors: [
        { name: 'Market Cap', score: 10.0, weight: 15, pass: true },
        { name: 'Liquidity', score: 7.0, weight: 15, pass: true },
        { name: 'Buy/Sell Ratio', score: 10.0, weight: 10, pass: true },
        { name: 'SM Flow', score: 8.9, weight: 20, pass: true },
        { name: 'Whale Backing', score: 10.0, weight: 15, pass: true },
        { name: 'Coordination', score: 10.0, weight: 10, pass: true },
        { name: 'Momentum', score: 6.0, weight: 10, pass: true },
        { name: 'Distribution', score: 8.0, weight: 5, pass: true },
      ],
    },
    {
      symbol: 'CHIMP', chain: 'base', alphaScore: 31.1, volume24h: 725300,
      smartMoneyNetFlow: 4300, priceChange: 21.10, marketCap: 134500,
      buySellRatio: 1.01, riskGrade: 'D', riskScore: 4.2, conviction: 31.1,
      recommendation: 'AVOID',
      riskFactors: [
        { name: 'Market Cap', score: 2.0, weight: 15, pass: false },
        { name: 'Liquidity', score: 2.0, weight: 15, pass: false },
        { name: 'Buy/Sell Ratio', score: 5.0, weight: 10, pass: true },
        { name: 'SM Flow', score: 1.0, weight: 20, pass: false },
        { name: 'Whale Backing', score: 8.0, weight: 15, pass: true },
        { name: 'Coordination', score: 4.0, weight: 10, pass: false },
        { name: 'Momentum', score: 10.0, weight: 10, pass: true },
        { name: 'Distribution', score: 5.0, weight: 5, pass: true },
      ],
    },
    {
      symbol: 'VIRTUAL', chain: 'base', alphaScore: 30.7, volume24h: 6310000,
      smartMoneyNetFlow: 36600, priceChange: -3.36, marketCap: 426500000,
      buySellRatio: 1.01, riskGrade: 'B', riskScore: 7.1, conviction: 30.7,
      recommendation: 'WATCH',
      riskFactors: [
        { name: 'Market Cap', score: 10.0, weight: 15, pass: true },
        { name: 'Liquidity', score: 7.0, weight: 15, pass: true },
        { name: 'Buy/Sell Ratio', score: 5.0, weight: 10, pass: true },
        { name: 'SM Flow', score: 1.0, weight: 20, pass: false },
        { name: 'Whale Backing', score: 8.0, weight: 15, pass: true },
        { name: 'Coordination', score: 6.0, weight: 10, pass: true },
        { name: 'Momentum', score: 6.0, weight: 10, pass: true },
        { name: 'Distribution', score: 7.0, weight: 5, pass: true },
      ],
    },
  ];
}

export function getWhaleProfiles(): WhaleProfile[] {
  return [
    { address: '0xe9fe6c...a1dc99', chain: 'base', relatedWallets: 3, counterparties: 2 },
    { address: '0x000000...00dead', chain: 'base', relatedWallets: 1, counterparties: 0 },
    { address: '0x5c38ab...f341f4', chain: 'base', relatedWallets: 2, counterparties: 5 },
    { address: '7s1da8Dd...h4or2Z', chain: 'solana', relatedWallets: 3, counterparties: 0 },
  ];
}

export function getCoordinationClusters(): CoordinationCluster[] {
  return [
    { hub: '0xe9fe6c3c6fa47a...', chain: 'base', connectedWallets: 3, sharedTokens: 'PLAY', clusterScore: 5 },
    { hub: '0x5c38ab2c57b144...', chain: 'base', connectedWallets: 2, sharedTokens: 'PLAY', clusterScore: 7 },
    { hub: '7s1da8DduuBFqGra...', chain: 'solana', connectedWallets: 3, sharedTokens: 'JLP', clusterScore: 3 },
  ];
}

export function getPipelineMetrics(): PipelineMetrics {
  return {
    totalCalls: 52,
    uniqueEndpoints: 15,
    chainsCovered: 'Solana, Base',
    tokensScanned: 5,
    whalesProfiled: 4,
    coordinationClusters: 3,
    avgLatency: '2.2s',
    pipelineDuration: '115.6s',
    generatedAt: new Date().toISOString(),
  };
}

export function getWhaleNetworkGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const whales = getWhaleProfiles();
  const clusters = getCoordinationClusters();
  const tokens = getPipelineTokens();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const token of tokens) {
    nodes.push({ id: `token-${token.symbol}`, label: token.symbol, group: `chain-${token.chain}`, size: 3, isController: false });
  }

  for (const whale of whales) {
    const short = whale.address.slice(0, 6) + '...' + whale.address.slice(-4);
    nodes.push({ id: `whale-${whale.address}`, label: short, group: `chain-${whale.chain}`, size: 1.8 + Math.min(whale.counterparties, 3) * 0.3, isController: whale.counterparties > 2 });
  }

  for (const cluster of clusters) {
    const hubId = `cluster-${cluster.hub}`;
    nodes.push({ id: hubId, label: `Hub ${cluster.hub.slice(0, 6)}`, group: `chain-${cluster.chain}`, size: 2 + Math.min(cluster.clusterScore, 5) * 0.2, isController: true });

    for (let i = 0; i < cluster.connectedWallets; i++) {
      const walletId = `wallet-${cluster.hub}-${i}`;
      nodes.push({ id: walletId, label: `W${i + 1}`, group: `chain-${cluster.chain}`, size: 1, isController: false });
      links.push({ source: hubId, target: walletId, value: cluster.clusterScore });
    }

    const tokenNode = tokens.find(t => t.symbol === cluster.sharedTokens);
    if (tokenNode) links.push({ source: hubId, target: `token-${tokenNode.symbol}`, value: cluster.clusterScore });
  }

  for (const whale of whales) {
    const whaleId = `whale-${whale.address}`;
    const relatedToken = whale.chain === 'solana' ? 'JLP' : 'PLAY';
    const tokenId = `token-${relatedToken}`;
    if (nodes.find(n => n.id === tokenId)) links.push({ source: whaleId, target: tokenId, value: 2 });

    for (let i = 0; i < Math.min(whale.relatedWallets, 2); i++) {
      const relatedId = `related-${whale.address}-${i}`;
      nodes.push({ id: relatedId, label: `R${i + 1}`, group: `chain-${whale.chain}`, size: 0.7, isController: false });
      links.push({ source: whaleId, target: relatedId, value: 1 });
    }
  }

  return { nodes, links };
}

export function getEndpointDistribution(): { endpoint: string; calls: number }[] {
  return [
    { endpoint: 'Wallet Profiler', calls: 17 },
    { endpoint: 'Search', calls: 7 },
    { endpoint: 'SM DEX Trades', calls: 4 },
    { endpoint: 'Token Screener', calls: 3 },
    { endpoint: 'Token Holders', calls: 3 },
    { endpoint: 'Buy/Sell Analysis', calls: 3 },
    { endpoint: 'Token Flows', calls: 3 },
    { endpoint: 'Token Indicators', calls: 3 },
    { endpoint: 'SM Netflow', calls: 2 },
    { endpoint: 'SM Holdings', calls: 2 },
    { endpoint: 'Account', calls: 1 },
    { endpoint: 'SM DCAs', calls: 1 },
    { endpoint: 'AI Agent', calls: 1 },
    { endpoint: 'Wallet', calls: 1 },
    { endpoint: 'Trade Quote', calls: 1 },
  ];
}

export function getPipelinePhases(): { name: string; calls: number; duration: string; status: string }[] {
  return [
    { name: 'Discovery', calls: 9, duration: '18.3s', status: 'complete' },
    { name: 'Token Deep Dive', calls: 15, duration: '24.1s', status: 'complete' },
    { name: 'Whale Profiling', calls: 17, duration: '32.5s', status: 'complete' },
    { name: 'Derivatives Intel', calls: 3, duration: '8.7s', status: 'complete' },
    { name: 'Risk Assessment', calls: 3, duration: '4.0s', status: 'complete' },
    { name: 'AI Analysis', calls: 1, duration: '1.5s', status: 'error' },
    { name: 'Execution', calls: 4, duration: '26.5s', status: 'complete' },
  ];
}
