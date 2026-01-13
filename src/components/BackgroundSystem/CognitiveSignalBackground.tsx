import React, { useEffect, useRef, useMemo } from 'react';
import { useBackground, SemanticMode } from './BackgroundContext';
import { getBackgroundSeed, hashString } from '@/lib/background-seed';
import { FocusState } from '@/hooks/useInteractionDensity';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export const CognitiveSignalBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { semanticMode, focusState } = useBackground();
  const seed = useMemo(() => hashString(getBackgroundSeed()) % 1000, []);
  
  const stateRef = useRef({
    focusState,
    semanticMode,
    time: 0,
    active: true
  });

  useEffect(() => {
    stateRef.current.focusState = focusState;
    stateRef.current.semanticMode = semanticMode;
    stateRef.current.active = true;
  }, [focusState, semanticMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    
    // System behavior constants
    const settings = {
      scanning: { speed: 0.002, diffusion: 0.5, coherence: 0.8 },
      thinking: { speed: 0.001, diffusion: 0.2, coherence: 0.95 },
      executing: { speed: 0.005, diffusion: 0.8, coherence: 0.6 },
      idle: { decay: 0.98, speedMult: 0.2 }
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Deterministic points based on seed
    const points: Point[] = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
       const s = (seed + i * 137) % 1000;
       points.push({
         x: (s / 1000) * width,
         y: ((s * 7) % 1000 / 1000) * height,
         vx: 0,
         vy: 0,
         size: 200 + (s % 300),
         alpha: 0.05 + (s % 50 / 1000)
       });
    }

    let lastTime = performance.now();
    let idleLevel = 1.0;

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);
      
      const delta = now - lastTime;
      lastTime = now;

      const { focusState, semanticMode } = stateRef.current;
      const config = settings[semanticMode];
      
      // Focus-based decay
      if (focusState === 'idle') {
        idleLevel *= settings.idle.decay;
      } else {
        idleLevel = Math.min(1.0, idleLevel + 0.05);
      }

      if (idleLevel < 0.01) return; // Sleep

      ctx.fillStyle = '#020617'; // Deep slate background
      ctx.fillRect(0, 0, width, height);

      const time = now * config.speed * (focusState === 'idle' ? settings.idle.speedMult : 1);

      points.forEach((p, i) => {
        // Deterministic noise-like motion
        const angle = Math.sin(time + i) * Math.PI * 2 * config.coherence;
        p.vx += Math.cos(angle) * 0.1;
        p.vy += Math.sin(angle) * 0.1;

        p.x += p.vx;
        p.y += p.vy;

        // Soft friction
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Wrap or Bounce
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = height + p.size;
        if (p.y > height + p.size) p.y = -p.size;

        // Render pressure zone
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        
        let color = '255, 255, 255';
        if (semanticMode === 'executing') color = '139, 92, 246'; // Purple
        if (semanticMode === 'thinking') color = '56, 189, 248'; // Sky blue

        gradient.addColorStop(0, `rgba(${color}, ${p.alpha * idleLevel})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      });
    };

    animationFrameId = requestAnimationFrame(render);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, [seed]); // Seed is constant

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 w-screen h-screen pointer-events-none"
      style={{ filter: 'blur(40px) saturate(1.2)' }}
    />
  );
};

export default CognitiveSignalBackground;
