"use client";

import { getCoordinationClusters, getWhaleProfiles } from "@/lib/pipeline-data";

export function CoordinationGraph() {
  const clusters = getCoordinationClusters();
  const whales = getWhaleProfiles();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {clusters.map((cluster, i) => (
          <div key={cluster.hub} className="bg-[#0f1528] border border-[#1a2240] rounded-lg p-3 hover:border-[#cc44ff]/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#cc44ff]/70">Cluster {i + 1}</span>
              <span className={`text-xs font-mono font-bold ${cluster.clusterScore >= 6 ? "text-[#ff3366]" : cluster.clusterScore >= 4 ? "text-[#ff9f1c]" : "text-[#4488ff]"}`}>
                Score: {cluster.clusterScore}
              </span>
            </div>

            <div className="text-xs font-mono text-[#e0e6f0]/70 mb-2 truncate">{cluster.hub}</div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div><span className="text-[#e0e6f0]/30 block">Chain</span><span className={cluster.chain === "solana" ? "text-[#9945FF]" : "text-[#4488ff]"}>{cluster.chain}</span></div>
              <div><span className="text-[#e0e6f0]/30 block">Wallets</span><span className="text-[#e0e6f0]/60">{cluster.connectedWallets}</span></div>
              <div><span className="text-[#e0e6f0]/30 block">Token</span><span className="text-[#00ff88]">{cluster.sharedTokens}</span></div>
              <div><span className="text-[#e0e6f0]/30 block">Risk</span><span className={cluster.clusterScore >= 6 ? "text-[#ff3366]" : "text-[#ff9f1c]"}>{cluster.clusterScore >= 6 ? "HIGH" : cluster.clusterScore >= 4 ? "MED" : "LOW"}</span></div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[#cc44ff]/30 border border-[#cc44ff]/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#cc44ff]" />
              </div>
              {Array.from({ length: cluster.connectedWallets }).map((_, j) => (
                <div key={`w-${i}-${j}`} className="flex items-center">
                  <div className="w-6 h-px bg-[#cc44ff]/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4488ff]/20 border border-[#4488ff]/40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {whales.map((whale) => (
          <div key={whale.address} className="bg-[#0f1528] border border-[#1a2240] rounded-lg p-3 hover:border-[#4488ff]/20 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${whale.chain === "solana" ? "bg-[#9945FF]" : "bg-[#4488ff]"}`} />
              <span className="text-[10px] font-mono text-[#e0e6f0]/70 truncate">{whale.address}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div><span className="text-[#e0e6f0]/30 block">Related</span><span className="text-[#cc44ff]">{whale.relatedWallets} wallets</span></div>
              <div><span className="text-[#e0e6f0]/30 block">Counterparties</span><span className="text-[#4488ff]">{whale.counterparties}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
