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
  hue: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export const CognitiveSignalBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { semanticMode, focusState } = useBackground();
  const seed = useMemo(() => hashString(getBackgroundSeed()) % 1000, []);
  const mouseRef = useRef({ x: 0, y: 0, isMoving: false });
  const particlesRef = useRef<Particle[]>([]);
  
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
    
    // Enhanced system behavior constants
    const settings = {
      scanning: { speed: 0.003, diffusion: 0.6, coherence: 0.75, pulseIntensity: 0.3 },
      thinking: { speed: 0.0015, diffusion: 0.25, coherence: 0.95, pulseIntensity: 0.6 },
      executing: { speed: 0.006, diffusion: 0.9, coherence: 0.55, pulseIntensity: 0.8 },
      idle: { decay: 0.98, speedMult: 0.2 }
    };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Deterministic points based on seed with enhanced properties
    const points: Point[] = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
       const s = (seed + i * 137) % 1000;
       points.push({
         x: (s / 1000) * width,
         y: ((s * 7) % 1000 / 1000) * height,
         vx: (Math.cos(s) * 0.5),
         vy: (Math.sin(s) * 0.5),
         size: 180 + (s % 350),
         alpha: 0.06 + (s % 40 / 1000),
         hue: s % 360
       });
    }

    let lastTime = performance.now();
    let idleLevel = 1.0;
    let mouseIdleTimer = 0;

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        isMoving: true 
      };
      mouseIdleTimer = 0;

      // Create particles on mouse movement
      if (Math.random() > 0.7) {
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          maxLife: 60 + Math.random() * 60,
          size: 2 + Math.random() * 4
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

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

      // Mouse idle detection
      mouseIdleTimer += delta;
      if (mouseIdleTimer > 2000) {
        mouseRef.current.isMoving = false;
      }

      if (idleLevel < 0.01 && !mouseRef.current.isMoving) return;

      // Deep gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#020617');
      bgGradient.addColorStop(0.5, '#0f172a');
      bgGradient.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      const time = now * config.speed * (focusState === 'idle' ? settings.idle.speedMult : 1);
      const pulseIntensity = Math.sin(time * 0.5) * config.pulseIntensity;

      points.forEach((p, i) => {
        // Enhanced motion with mouse interaction
        const baseAngle = Math.sin(time + i) * Math.PI * 2 * config.coherence;
        let targetVx = Math.cos(baseAngle) * 0.15;
        let targetVy = Math.sin(baseAngle) * 0.15;

        // Mouse attraction/repulsion
        if (mouseRef.current.isMoving) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 300) {
            const force = (1 - dist / 300) * 0.5;
            targetVx += (dx / dist) * force;
            targetVy += (dy / dist) * force;
          }
        }

        // Orbital motion around center
        const centerX = width / 2;
        const centerY = height / 2;
        const toCenterX = centerX - p.x;
        const toCenterY = centerY - p.y;
        const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
        const orbitForce = 0.0001;
        targetVx += (-toCenterY / distToCenter) * orbitForce * distToCenter;
        targetVy += (toCenterX / distToCenter) * orbitForce * distToCenter;

        p.vx += (targetVx - p.vx) * 0.1;
        p.vy += (targetVy - p.vy) * 0.1;

        p.x += p.vx;
        p.y += p.vy;

        // Soft friction
        p.vx *= 0.97;
        p.vy *= 0.97;

        // Wrap around edges
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = height + p.size;
        if (p.y > height + p.size) p.y = -p.size;

        // Dynamic size pulsing
        const sizePulse = p.size * (1 + pulseIntensity * 0.2);

        // Enhanced gradient with mode-specific colors
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sizePulse);
        
        // Always use rainbow effect
        const hue = (p.hue + time * 10) % 360;
        const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.7);
        const color = `${r}, ${g}, ${b}`;
        const secondaryColor = `${Math.floor(r * 0.8)}, ${Math.floor(g * 0.8)}, ${Math.floor(b * 0.8)}`;

        const alpha = p.alpha * idleLevel * (1 + pulseIntensity * 0.3);
        
        gradient.addColorStop(0, `rgba(${color}, ${alpha * 1.2})`);
        gradient.addColorStop(0.3, `rgba(${secondaryColor}, ${alpha * 0.6})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p.x, p.y, sizePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      });

      // Connection lines between nearby points
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 250) {
            const alpha = (1 - dist / 250) * 0.3 * idleLevel;
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      // Render and update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05; // gravity
        particle.life++;

        const lifeRatio = 1 - (particle.life / particle.maxLife);
        
        if (particle.life >= particle.maxLife) return false;

        ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.8})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * lifeRatio, 0, Math.PI * 2);
        ctx.fill();

        return true;
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
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationFrameId);
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 w-screen h-screen pointer-events-none"
      style={{ filter: 'blur(45px) saturate(1.3)' }}
    />
  );
};

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export default CognitiveSignalBackground;