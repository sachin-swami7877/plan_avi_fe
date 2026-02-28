import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import CountdownOverlay from './CountdownOverlay';
import GoOverlay from './GoOverlay';

const CANVAS_W = 400;
const CANVAS_H = 260;

const GRAPH_LEFT   = 6;
const GRAPH_RIGHT  = CANVAS_W - 52;
const GRAPH_TOP    = 44;
const GRAPH_BOTTOM = CANVAS_H - 6;
const GRAPH_W      = GRAPH_RIGHT - GRAPH_LEFT;
const GRAPH_H      = GRAPH_BOTTOM - GRAPH_TOP;

// Fixed max multiplier for scaling — plane mostly crashes before 16x
const MAX_MULT = 16;

/* ──── Plane ──── */
function drawPlane(ctx, cx, cy, angle, scale = 1) {
  const s = scale * 1.6;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
  ctx.shadowBlur = 12 * s;

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(14 * s, 0);
  ctx.lineTo(20 * s, -1 * s);
  ctx.lineTo(20 * s, 1 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(-2 * s, -2 * s); ctx.lineTo(4 * s, -2 * s);
  ctx.lineTo(-4 * s, -14 * s); ctx.lineTo(-7 * s, -12 * s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2 * s, 2 * s); ctx.lineTo(4 * s, 2 * s);
  ctx.lineTo(-4 * s, 14 * s); ctx.lineTo(-7 * s, 12 * s);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(-12 * s, -1 * s); ctx.lineTo(-14 * s, -8 * s);
  ctx.lineTo(-10 * s, -6 * s); ctx.lineTo(-8 * s, -1 * s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12 * s, 1 * s); ctx.lineTo(-14 * s, 6 * s);
  ctx.lineTo(-10 * s, 5 * s); ctx.lineTo(-8 * s, 1 * s);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(8 * s, -1.5 * s, 3 * s, 2 * s, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(20 * s, -5 * s); ctx.lineTo(20 * s, 5 * s);
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ──── Bezier tangent at end (t=1) ──── */
function bezierEndAngle(p0, cp1, cp2, p3) {
  const dx = 3 * (p3.x - cp2.x);
  const dy = 3 * (p3.y - cp2.y);
  return Math.atan2(dy, dx);
}

/* ──── Sample bezier for area fill ──── */
function sampleBezier(p0, cp1, cp2, p3, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt*mt*mt*p0.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*p3.x;
    const y = mt*mt*mt*p0.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*p3.y;
    pts.push({ x, y });
  }
  return pts;
}

const GameGraph = ({ betsEnabled = true }) => {
  const canvasRef = useRef(null);
  const { gameState } = useSocket();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = CANVAS_W;
    const height = CANVAS_H;

    ctx.clearRect(0, 0, width, height);

    // ── Background ──
    const radial = ctx.createRadialGradient(
      width * 0.2, height * 1.1, 0,
      width * 0.5, height * 0.5, width * 1.0
    );
    radial.addColorStop(0, '#0f0a18');
    radial.addColorStop(0.5, '#0a0612');
    radial.addColorStop(1, '#151022');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // ── Diagonal rays ──
    ctx.strokeStyle = 'rgba(100, 60, 140, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 28; i++) {
      const a = -0.5 + (i / 28) * 0.9;
      const len = width * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, height + 15);
      ctx.lineTo(Math.cos(a) * len, height + 15 + Math.sin(a) * len);
      ctx.stroke();
    }

    // ── Grid dots ──
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i <= 12; i++) {
      ctx.beginPath(); ctx.arc((width / 12) * i, height - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.arc(2, height - (height / 8) * i, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Get multiplier ──
    const mult = gameState.multiplier ?? 1;
    const isRunning = gameState.status === 'running';
    const isCrashed = gameState.status === 'crashed';

    // Only draw curve when game is active and mult > 1
    if ((isRunning || isCrashed) && mult > 1.001) {

      // ═══ ALL positions derived from multiplier — refresh-safe ═══

      // X position: log-based (proportional to elapsed time)
      //   ln(1)=0 → left edge,  ln(16)=2.77 → right edge
      //   This gives natural time-like spread:
      //     2x → 25% across, 4x → 50%, 8x → 75%, 16x → 100%
      const xProgress = Math.min(Math.log(mult) / Math.log(MAX_MULT), 1);
      const endX = GRAPH_LEFT + xProgress * GRAPH_W;

      // Y position: linear multiplier on fixed 16x scale
      //   1x = bottom (~8px above edge), 16x = top
      //   Each x adds ~14px of height (GRAPH_H/15 ≈ 14px per 1x)
      //   So: 1x=8px, 2x=22px, 3x=36px, 5x=64px, 10x=134px, 16x=210px
      const MIN_H = 8;  // minimum height in px at 1.0x
      const yProgress = Math.min((mult - 1) / (MAX_MULT - 1), 1);
      const endY = GRAPH_BOTTOM - MIN_H - yProgress * (GRAPH_H - MIN_H);

      // ── Bezier control points ──
      const startX = GRAPH_LEFT;
      const startY = GRAPH_BOTTOM;

      // CP1: ~60% across the bottom — keeps curve flat at start
      const cp1x = startX + (endX - startX) * 0.6;
      const cp1y = startY;

      // CP2: near end point, pulled slightly toward bottom — sharp upward sweep
      const cp2x = endX - (endX - startX) * 0.08;
      const cp2y = endY + (startY - endY) * 0.1;

      const P0  = { x: startX, y: startY };
      const CP1 = { x: cp1x,  y: cp1y };
      const CP2 = { x: cp2x,  y: cp2y };
      const P3  = { x: endX,  y: endY };

      // ── Area fill ──
      const curveSamples = sampleBezier(P0, CP1, CP2, P3, 60);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      curveSamples.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(endX, GRAPH_BOTTOM);
      ctx.lineTo(startX, GRAPH_BOTTOM);
      ctx.closePath();

      const fillG = ctx.createLinearGradient(0, GRAPH_TOP, 0, GRAPH_BOTTOM);
      fillG.addColorStop(0, isCrashed ? 'rgba(160,25,25,0.35)' : 'rgba(248,80,80,0.40)');
      fillG.addColorStop(0.5, isCrashed ? 'rgba(130,18,18,0.15)' : 'rgba(220,38,38,0.20)');
      fillG.addColorStop(1, 'rgba(160,25,25,0.02)');
      ctx.fillStyle = fillG;
      ctx.fill();

      // ── Glow ──
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = isCrashed ? 'rgba(185,28,28,0.18)' : 'rgba(239,68,68,0.22)';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.stroke();

      // ── Main curve stroke ──
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = isCrashed ? '#b91c1c' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      // ── Plane at tip ──
      const planeAngle = bezierEndAngle(P0, CP1, CP2, P3);
      const planeX = Math.min(endX, GRAPH_RIGHT - 14);
      const planeY = Math.max(endY, GRAPH_TOP + 14);
      drawPlane(ctx, planeX, planeY, planeAngle, 1.2);
    }
  }, [gameState]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-[#0a0612]">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full block"
        style={{ display: 'block' }}
      />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-6xl md:text-7xl font-bold text-white drop-shadow-[0_0_24px_rgba(0,0,0,0.8)]">
          {gameState.status === 'crashed'
            ? (gameState.crashMultiplier != null ? `${gameState.crashMultiplier.toFixed(2)}x` : '1.00x')
            : gameState.status === 'running'
              ? (gameState.multiplier != null ? `${gameState.multiplier.toFixed(2)}x` : '1.00x')
              : gameState.status === 'waiting'
                ? 'Place Bets!'
                : '1.00x'}
        </span>
      </div>

      {gameState.status === 'crashed' && gameState.countdown != null && (
        <CountdownOverlay secondsLeft={gameState.countdown} />
      )}

      {gameState.status === 'waiting' && gameState.showGo && (
        <GoOverlay show={gameState.showGo} />
      )}

      {gameState.status === 'crashed' && gameState.countdown == null && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="bg-red-500/90 text-white px-4 py-2 rounded-full text-sm font-bold">
            Crashed!
          </span>
        </div>
      )}

      {!betsEnabled && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="bg-yellow-500/90 text-white px-4 py-2 rounded-full text-sm font-bold">
            Bets Are Paused
          </span>
        </div>
      )}
    </div>
  );
};

export default GameGraph;
