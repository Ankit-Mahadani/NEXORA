"use client";

import React, { useState } from "react";

interface SphereProps {
  isProcessing?: boolean;
}

export function VioletAtmosphericSphere({ isProcessing = false }: SphereProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex items-center justify-center select-none cursor-pointer py-2 transition-transform duration-500 ease-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? "scale(1.08)" : "scale(1)",
      }}
    >
      {/* 1. Deep Atmospheric Outer Ambient Glow */}
      <div 
        className="absolute w-52 h-52 rounded-full blur-3xl opacity-70 animate-aura-pulse pointer-events-none"
        style={{
          background: isProcessing 
            ? "radial-gradient(circle, rgba(216, 180, 254, 0.6) 0%, rgba(244, 114, 182, 0.35) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(192, 160, 252, 0.5) 0%, rgba(220, 195, 255, 0.3) 50%, transparent 75%)",
          transition: "background 0.8s ease",
        }}
      />

      {/* 2. Fluid Swirling Orbital Crescent Halo (from user reference image) */}
      <div 
        className="absolute w-32 h-32 rounded-full animate-fluid-orbit pointer-events-none"
        style={{
          background: "conic-gradient(from 140deg, transparent 0deg, rgba(168, 85, 247, 0.25) 80deg, rgba(192, 132, 252, 0.75) 200deg, rgba(232, 121, 249, 0.5) 280deg, transparent 360deg)",
          filter: "blur(7px)",
          opacity: isHovered ? 0.95 : 0.75,
        }}
      />

      {/* 3. Secondary Counter-Orbiting Vapor Halo */}
      <div 
        className="absolute w-28 h-28 rounded-full pointer-events-none"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(216, 180, 254, 0.4) 140deg, transparent 240deg)",
          filter: "blur(8px)",
          animation: "fluid-orbit 16s linear infinite reverse",
        }}
      />

      {/* 4. Central Pearlescent Glass Sphere Body */}
      <div 
        className="relative w-24 h-24 rounded-full flex items-center justify-center animate-orb-levitate animate-liquid-morph"
        style={{
          background: "radial-gradient(circle at 34% 28%, #ffffff 0%, #f3ebff 30%, #d8b4fe 65%, #b286f7 95%)",
          boxShadow: isHovered
            ? `
              0 14px 40px rgba(168, 85, 247, 0.45),
              0 0 25px rgba(216, 180, 254, 0.6),
              inset -5px -8px 16px rgba(147, 51, 234, 0.4),
              inset 4px 4px 12px rgba(255, 255, 255, 0.95)
            `
            : `
              0 10px 30px rgba(168, 85, 247, 0.35),
              0 0 16px rgba(192, 132, 252, 0.4),
              inset -4px -6px 14px rgba(147, 85, 245, 0.35),
              inset 3px 3px 10px rgba(255, 255, 255, 0.9)
            `,
          transition: "box-shadow 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* 5. Shimmering Specular Glass Highlight */}
        <div 
          className="absolute top-2 left-3 w-10 h-7 rounded-full blur-[1px] animate-specular-shimmer pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.15) 80%)",
          }}
        />

        {/* 6. Internal Iridescent Soft Shadow Curve */}
        <div 
          className="absolute inset-1 rounded-full opacity-65 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 68% 72%, rgba(147, 51, 234, 0.35) 0%, transparent 60%)",
          }}
        />

        {/* 7. Subtle Core Breath Pulse */}
        <div 
          className="w-8 h-8 rounded-full blur-sm opacity-50 animate-pulse pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(216, 180, 254, 0.4) 100%)",
          }}
        />
      </div>
    </div>
  );
}
