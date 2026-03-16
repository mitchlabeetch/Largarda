import React, { useEffect, useRef } from 'react';
import { useThemeContext } from '@/renderer/context/ThemeContext';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacityDelta: number;
  color: string;
};

// Light mode particle colors: lavender purple, sage green, blush pink, cream
const LIGHT_COLORS = ['rgba(160, 120, 210, {a})', 'rgba(100, 168, 148, {a})', 'rgba(220, 160, 190, {a})', 'rgba(200, 170, 220, {a})', 'rgba(140, 190, 170, {a})'];

// Dark mode: deeper, like stars
const DARK_COLORS = ['rgba(192, 144, 224, {a})', 'rgba(122, 184, 180, {a})', 'rgba(210, 150, 190, {a})', 'rgba(160, 120, 220, {a})', 'rgba(100, 170, 200, {a})'];

const PARTICLE_COUNT = 38;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createParticle(w: number, h: number, colors: string[]): Particle {
  const baseOpacity = randomBetween(0.18, 0.55);
  return {
    x: randomBetween(0, w),
    y: randomBetween(0, h),
    vx: randomBetween(-0.18, 0.18),
    vy: randomBetween(-0.14, 0.14),
    radius: randomBetween(1.2, 3.2),
    opacity: baseOpacity,
    opacityDelta: randomBetween(0.002, 0.006) * (Math.random() > 0.5 ? 1 : -1),
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const { theme } = useThemeContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Init particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle(canvas.width, canvas.height, colors));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Breathe opacity
        p.opacity += p.opacityDelta;
        if (p.opacity > 0.6 || p.opacity < 0.08) {
          p.opacityDelta *= -1;
        }

        // Draw
        const colorStr = p.color.replace('{a}', String(Math.max(0, Math.min(1, p.opacity))));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = colorStr;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      resize();
      // Redistribute particles on resize
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle(canvas.width, canvas.height, colors));
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden='true'
    />
  );
};

export default ParticleBackground;
