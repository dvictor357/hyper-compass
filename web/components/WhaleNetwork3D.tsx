"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { GraphNode, GraphLink } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
}

const GROUP_COLORS: Record<string, string> = {
  "chain-base": "#4488ff",
  "chain-solana": "#9945FF",
  "chain-ethereum": "#627EEA",
  "chain-arbitrum": "#28A0F0",
};

function nodeColor(n: GraphNode): string {
  if (n.id.startsWith("token-")) return "#00ff88";
  if (n.isController) return "#ff3366";
  return GROUP_COLORS[n.group] || "#4488ff";
}

function nodeRadius(n: GraphNode): number {
  if (n.id.startsWith("token-")) return 3.5;
  if (n.isController) return 2.8;
  if (n.id.startsWith("whale-")) return 2.2;
  return 1.5;
}

export function WhaleNetwork3D({ nodes, links, width, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [mod, setMod] = useState<{ ForceGraph: any; THREE: any } | null>(null);

  useEffect(() => {
    Promise.all([import("react-force-graph-3d"), import("three")]).then(([fg, three]) => {
      setMod({ ForceGraph: fg.default, THREE: three });
    });
  }, []);

  const handleClick = useCallback((node: any) => {
    if (!fgRef.current) return;
    const dist = 40;
    const ratio = 1 + dist / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current.cameraPosition(
      { x: (node.x || 0) * ratio, y: (node.y || 0) * ratio, z: (node.z || 0) * ratio },
      node,
      1000,
    );
  }, []);

  const handleZoom = useCallback((dir: "in" | "out" | "reset") => {
    if (!fgRef.current) return;
    if (dir === "reset") {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 120 }, { x: 0, y: 0, z: 0 }, 800);
      return;
    }
    const cam = fgRef.current.camera();
    const f = dir === "in" ? 0.7 : 1.4;
    fgRef.current.cameraPosition({ x: cam.position.x * f, y: cam.position.y * f, z: cam.position.z * f }, undefined, 400);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge")?.strength(-40);
      fgRef.current.d3Force("link")?.distance(25);
      fgRef.current.d3Force("center")?.strength(0.8);
      setTimeout(() => fgRef.current?.cameraPosition({ x: 0, y: 0, z: 120 }, { x: 0, y: 0, z: 0 }, 0), 100);
    }
  }, [mod]);

  const graphData = useMemo(() => ({
    nodes: nodes.map((n) => ({ ...n, color: nodeColor(n), val: n.size, __radius: nodeRadius(n) })),
    links: links.map((l) => ({ source: l.source, target: l.target, value: l.value })),
  }), [nodes, links]);

  const nodeThreeObject = useCallback((node: any) => {
    if (!mod) return undefined;
    const { THREE } = mod;
    const group = new THREE.Group();
    const radius = node.__radius || 2;
    const color = node.color || "#4488ff";

    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color), transparent: true, opacity: 0.92,
      shininess: 100, emissive: new THREE.Color(color), emissiveIntensity: 0.15,
    });
    group.add(new THREE.Mesh(geo, mat));

    const glowGeo = new THREE.SphereGeometry(radius * 1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.06 });
    group.add(new THREE.Mesh(glowGeo, glowMat));

    if (node.label && node.label.length <= 12) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const isToken = node.id.startsWith("token-");
      const fontSize = isToken ? 32 : 22;
      canvas.width = 256;
      canvas.height = 64;
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 6;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isToken ? "#ffffff" : "#c0c8e0";
      ctx.fillText(node.label, 128, 32);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(spriteMat);
      const scale = isToken ? 16 : 12;
      sprite.scale.set(scale, scale * 0.25, 1);
      sprite.position.set(0, radius + 3, 0);
      group.add(sprite);
    }

    return group;
  }, [mod]);

  if (!mod) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#4488ff] font-mono text-sm animate-pulse">Loading 3D Network...</div>
      </div>
    );
  }

  const { ForceGraph } = mod;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <ForceGraph
        ref={fgRef}
        graphData={graphData}
        width={width || 800}
        height={height || 500}
        backgroundColor="rgba(10, 14, 26, 0)"
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        nodeLabel={(n: any) => `${n.label} (${n.id.startsWith("token-") ? "Token" : n.isController ? "Hub" : "Wallet"})`}
        linkColor={() => "rgba(68, 180, 255, 0.25)"}
        linkWidth={0.4}
        linkOpacity={0.3}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={1.2}
        linkDirectionalParticleColor={() => "#00ff88"}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={handleClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {[
          { dir: "in" as const, label: "+", cls: "text-lg" },
          { dir: "out" as const, label: "\u2212", cls: "text-lg" },
          { dir: "reset" as const, label: "\u27F3", cls: "text-[9px]" },
        ].map((b) => (
          <button
            key={b.dir}
            type="button"
            onClick={() => handleZoom(b.dir)}
            className={`w-8 h-8 bg-[#0a0e1a]/90 border border-[#4488ff]/30 rounded-lg text-[#4488ff] font-mono font-bold ${b.cls} hover:bg-[#4488ff]/10 transition-all flex items-center justify-center backdrop-blur-sm`}
            title={`Zoom ${b.dir}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 bg-[#0a0e1a]/90 border border-[#1a2240] rounded-lg px-3 py-2.5 text-[10px] font-mono space-y-1.5 backdrop-blur-sm">
        {[{ color: "#00ff88", label: "Token" }, { color: "#ff3366", label: "Hub" }, { color: "#4488ff", label: "Base" }, { color: "#9945FF", label: "Solana" }].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[#e0e6f0]/60">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 bg-[#0a0e1a]/70 border border-[#1a2240] rounded-lg px-2.5 py-1.5 text-[8px] font-mono text-[#e0e6f0]/30 backdrop-blur-sm">
        Click node to focus | Drag to rotate | Scroll to zoom
      </div>
    </div>
  );
}
