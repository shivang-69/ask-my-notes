"use client";

import React, { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  targetX?: number;
  targetY?: number;
  pullStrength: number;
}

interface ParticleCanvasProps {
  isSearching: boolean;
  isRetrieving: boolean;
}

export default function ParticleCanvas({ isSearching, isRetrieving }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 65;

    // Pulse wave variables
    let pulseRadius = 0;
    let pulseActive = false;
    let pulseMaxRadius = 0;

    // Gravity wells for retrieval clustering (representing top-3 sources)
    const gravityWells = [
      { x: 0.3, y: 0.4, active: false },
      { x: 0.7, y: 0.3, active: false },
      { x: 0.5, y: 0.6, active: false },
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      pulseMaxRadius = Math.max(canvas.width, canvas.height) * 0.8;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const colors = ["#818cf8", "#c084fc", "#6366f1", "#a855f7"]; // Sleek Indigo & Purple
      for (let i = 0; i < particleCount; i++) {
        const baseAlpha = Math.random() * 0.4 + 0.15;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // Extremely slow drift
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 2 + 1,
          alpha: baseAlpha,
          baseAlpha: baseAlpha,
          color: colors[Math.floor(Math.random() * colors.length)],
          pullStrength: Math.random() * 0.02 + 0.01,
        });
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Trigger pulse on search transition
    if (isSearching) {
      pulseActive = true;
      pulseRadius = 0;
    }

    // Configure gravity wells on retrieval
    if (isRetrieving) {
      gravityWells.forEach((well) => {
        well.active = true;
        // Position wells dynamically in pixel space based on canvas size
        well.x = (0.2 + Math.random() * 0.6) * canvas.width;
        well.y = (0.2 + Math.random() * 0.6) * canvas.height;
      });
    }

    // Animation Loop
    const render = () => {
      if (reducedMotion) {
        // Draw static sparse particles and stop requestAnimationFrame loop
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.baseAlpha * 0.5; // Muted opacity for static view
          ctx.fill();
        });
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Draw and expand query pulse wave
      if (pulseActive) {
        pulseRadius += 10;
        if (pulseRadius > pulseMaxRadius) {
          pulseActive = false;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          Math.max(0, pulseRadius - 40),
          centerX,
          centerY,
          pulseRadius
        );
        gradient.addColorStop(0, "rgba(99, 102, 241, 0)");
        gradient.addColorStop(0.5, "rgba(129, 140, 248, 0.08)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 40;
        ctx.stroke();
      }

      // 2. Update and draw particles
      particles.forEach((p) => {
        // If query pulse travels and hits particle, highlight and push it outward
        if (pulseActive) {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // If particle lies close to the expanding wave front
          if (Math.abs(dist - pulseRadius) < 30) {
            p.alpha = Math.min(p.baseAlpha * 2.5, 0.9);
            // Push velocity slightly outward
            const angle = Math.atan2(dy, dx);
            p.vx += Math.cos(angle) * 0.15;
            p.vy += Math.sin(angle) * 0.15;
          }
        }

        // If retrieval clustering is active, pull particles toward gravity wells
        if (isRetrieving) {
          // Assign each particle to a gravity well deterministically
          const wellIndex = Math.floor((p.x + p.y) % gravityWells.length);
          const well = gravityWells[wellIndex];
          if (well && well.active) {
            const dx = well.x - p.x;
            const dy = well.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 10) {
              // Gravitational pull force
              p.vx += (dx / dist) * p.pullStrength;
              p.vy += (dy / dist) * p.pullStrength;
              p.alpha = Math.min(p.baseAlpha * 2.0, 0.85);
            }
          }
        } else {
          // Return alpha to normal levels gradually
          if (p.alpha > p.baseAlpha) {
            p.alpha -= 0.005;
          }
        }

        // Apply friction to prevent velocities from building up infinitely
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Apply normal drift
        p.x += p.vx + (Math.random() - 0.5) * 0.05;
        p.y += p.vy + (Math.random() - 0.5) * 0.05;

        // Wrap around boundaries
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSearching, isRetrieving, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: reducedMotion ? 0.35 : 0.6 }}
    />
  );
}
