import React, { useEffect, useRef, useState } from 'react';
import { AudioSynther } from './AudioSynther';
import { LogOut } from 'lucide-react';

interface PlayerData {
  id: string;
  isHuman: boolean;
  username: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: boolean;
  score: number;
  color: string;
}

interface Item {
  id: string;
  type: 'food1' | 'food2' | 'food3' | 'bomb';
  x: number;
  y: number;
  w: number;
  h: number;
  points: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  players: PlayerData[];
  items: Item[];
  platforms: Platform[];
  timeLeft: number;
  isPlaying: boolean;
}

interface VisualEffect {
  x: number;
  y: number;
  text: string;
  isBomb: boolean;
  life: number; // 0 to 1
}

const Audio = new AudioSynther();

export default function GameCanvas({ username, onLogout }: { username: string; onLogout: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const effectsRef = useRef<VisualEffect[]>([]);
  const keysRef = useRef({ left: false, right: false, jump: false });

  // Init WS and Audio
  useEffect(() => {
    // Only init audio on first click, but we can do it here directly
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    setWs(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', username }));
      Audio.init();
      Audio.playBGM();
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'state') {
        stateRef.current = data;
      } else if (data.type === 'effect') {
        effectsRef.current.push({
          x: data.x,
          y: data.y,
          text: data.text,
          isBomb: data.isBomb,
          life: 1.0
        });
        if (data.isBomb) Audio.playBomb();
        else Audio.playEat();
      }
    };

    socket.onclose = () => {
      Audio.stopBGM();
    };

    return () => {
      socket.close();
      Audio.stopBGM();
    };
  }, [username]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keysRef.current.left = true;
      if (e.code === 'ArrowRight') keysRef.current.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp') keysRef.current.jump = true;
      sendInput();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keysRef.current.left = false;
      if (e.code === 'ArrowRight') keysRef.current.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp') keysRef.current.jump = false;
      sendInput();
    };

    const sendInput = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', keys: keysRef.current }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ws]);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear Background
      ctx.fillStyle = '#111827'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const state = stateRef.current;
      if (!state) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Draw Platforms
      ctx.fillStyle = '#4B5563'; // Gray platforms
      state.platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
      });

      // Draw Items
      state.items.forEach(it => {
        ctx.save();
        ctx.translate(it.x + it.w/2, it.y + it.h/2);
        if (it.type === 'food1') {
          ctx.fillStyle = '#EF4444'; // Red Apple
          ctx.beginPath(); ctx.arc(0, 0, it.w/2, 0, Math.PI*2); ctx.fill();
        } else if (it.type === 'food2') {
          ctx.fillStyle = '#F59E0B'; // Yellow Banana
          ctx.beginPath(); ctx.ellipse(0, 0, it.w/2, it.h/4, Math.PI/4, 0, Math.PI*2); ctx.fill();
        } else if (it.type === 'food3') {
          ctx.fillStyle = '#10B981'; // Green Diamond
          ctx.beginPath();
          ctx.moveTo(0, -it.h/2); ctx.lineTo(it.w/2, 0); ctx.lineTo(0, it.h/2); ctx.lineTo(-it.w/2, 0);
          ctx.fill();
        } else if (it.type === 'bomb') {
          ctx.fillStyle = '#000000'; // Black Bomb
          ctx.beginPath(); ctx.arc(0, 0, it.w/2, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#F97316'; ctx.lineWidth=3; // Fuse
          ctx.beginPath(); ctx.moveTo(0,-it.h/2); ctx.lineTo(it.w/2,-it.h); ctx.stroke();
        }
        ctx.restore();
      });

      // Draw Players
      state.players.forEach((p, idx) => {
        ctx.save();
        ctx.translate(p.x + p.w/2, p.y + p.h/2);
        
        ctx.fillStyle = p.color;
        if (idx === 0) {
          // P1: Square Robot Style
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          // Eyes
          ctx.fillStyle = 'white';
          ctx.fillRect(-8, -10, 6, 6);
          ctx.fillRect(2, -10, 6, 6);
        } else {
          // P2: Round Alien Style
          ctx.beginPath(); ctx.ellipse(0, 0, p.w/2, p.h/2, 0, 0, Math.PI*2); ctx.fill();
          // Eye
          ctx.fillStyle = 'white';
          ctx.beginPath(); ctx.arc(0, -5, 8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = 'black';
          ctx.beginPath(); ctx.arc(0, -5, 3, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
        
        // Username Tag
        ctx.fillStyle = 'white';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.username, p.x + p.w/2, p.y - 10);
      });

      // Draw Effects
      for (let i = effectsRef.current.length - 1; i >= 0; i--) {
        const eff = effectsRef.current[i];
        ctx.save();
        ctx.globalAlpha = eff.life;
        if (eff.isBomb) {
           ctx.fillStyle = '#EF4444';
           ctx.font = 'bold 24px sans-serif';
           // explosion circle
           ctx.beginPath();
           ctx.arc(eff.x + 16, eff.y + 16, (1-eff.life)*50, 0, Math.PI*2);
           ctx.fillStyle = `rgba(255, 100, 0, ${eff.life})`;
           ctx.fill();
        } else {
           ctx.fillStyle = '#10B981';
           ctx.font = 'bold 20px sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.fillText(eff.text, eff.x + 16, eff.y - (1 - eff.life) * 50);
        ctx.restore();

        eff.life -= 0.02;
        if (eff.life <= 0) effectsRef.current.splice(i, 1);
      }

      // UI OVERLAY
      // Timer
      const mins = Math.floor(state.timeLeft / 60000);
      const secs = Math.floor((state.timeLeft % 60000) / 1000);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, canvas.width / 2, 30);

      // Scoreboard
      ctx.textAlign = 'left';
      state.players.forEach((p, idx) => {
        ctx.fillStyle = p.color;
        if (idx === 0) {
          ctx.fillText(`P1: ${p.score}`, 20, 30);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(`P2: ${p.score}`, canvas.width - 20, 30);
        }
      });

      if (!state.isPlaying) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4 sm:p-8">
      
      {/* Header Container */}
      <div className="flex justify-between items-center w-full max-w-[840px] mb-6 px-2 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-indigo-400 uppercase drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]">
          Arcade Clash <span className="text-slate-500 font-normal">|</span> Stage 1
        </h2>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 px-4 py-2 rounded-lg transition-colors text-sm font-bold tracking-wide"
        >
          <LogOut size={16} />
          EXIT
        </button>
      </div>

      {/* Arcade Monitor Bezel */}
      <div className="relative p-3 sm:p-5 bg-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_4px_20px_rgba(255,255,255,0.05)] border border-slate-700/50 w-full max-w-[840px]">
        
        {/* Inner Screen Bezel */}
        <div className="relative bg-black rounded-2xl overflow-hidden border-[8px] border-slate-900 shadow-[inset_0_0_50px_rgba(0,0,0,1)] flex items-center justify-center">
          
          {/* Scanlines Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 pointer-events-none opacity-50 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]"></div>

          {/* CRT Flicker/Glow Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none mix-blend-screen opacity-10 bg-[radial-gradient(circle_at_center,theme(colors.indigo.400),transparent_80%)]"></div>

          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="block w-full max-w-[800px] aspect-[4/3] object-contain relative z-0"
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 -left-2 w-4 h-16 bg-slate-700 rounded-l-md -translate-y-1/2 border border-slate-600 border-r-0"></div>
        <div className="absolute top-1/2 -right-2 w-4 h-16 bg-slate-700 rounded-r-md -translate-y-1/2 border border-slate-600 border-l-0"></div>
      </div>
      
      {/* Controls Hint */}
      <div className="mt-8 flex gap-8 text-sm font-medium text-slate-400">
        <div className="flex items-center gap-2">
          <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white shadow-sm">←/→</kbd> Move
        </div>
        <div className="flex items-center gap-2">
          <kbd className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white shadow-sm">Space</kbd> Jump
        </div>
      </div>
    </div>
  );
}
