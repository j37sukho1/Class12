import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';

declare global {
  var wss: WebSocketServer;
}

const PORT = 3000;

interface PlayerData {
  id: string; // socket connection ID or username
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
  keys: { left: boolean; right: boolean; jump: boolean };
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

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Shared Game State
const GAME_TIME = 5 * 60 * 1000; // 5 minutes
let state = {
  players: [] as PlayerData[],
  items: [] as Item[],
  platforms: [
    { x: 0, y: 550, width: 800, height: 50 },
    { x: 50, y: 420, width: 250, height: 20 },
    { x: 500, y: 420, width: 250, height: 20 },
    { x: 250, y: 290, width: 300, height: 20 },
    { x: 50, y: 160, width: 250, height: 20 },
    { x: 500, y: 160, width: 250, height: 20 }
  ] as Platform[],
  timeLeft: GAME_TIME,
  isPlaying: false,
};

let gameLoopInterval: NodeJS.Timeout | null = null;
let itemSpawnInterval: NodeJS.Timeout | null = null;
let lastTick = Date.now();

function spawnPlayer(username: string, isHuman: boolean): PlayerData {
  const isP1 = state.players.length === 0;
  return {
    id: isHuman ? username : 'NPC',
    isHuman,
    username,
    x: isP1 ? 100 : 650,
    y: 500,
    vx: 0,
    vy: 0,
    w: 32,
    h: 48,
    onGround: false,
    score: 0,
    color: isP1 ? '#4285F4' : '#FBBC05',
    keys: { left: false, right: false, jump: false }
  };
}

function resetGame() {
  state.items = [];
  state.timeLeft = GAME_TIME;
  state.isPlaying = true;
  state.players.forEach((p, idx) => {
    p.score = 0;
    p.x = idx === 0 ? 100 : 650;
    p.y = 500;
    p.vx = 0;
    p.vy = 0;
  });
  lastTick = Date.now();
  console.log("Game restarted!");
}

function spawnItem() {
  if (!state.isPlaying) return;
  const types = ['food1', 'food2', 'food3', 'bomb'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  let points = 0;
  switch (type) {
    case 'food1': points = 10; break;
    case 'food2': points = 20; break;
    case 'food3': points = 30; break;
    case 'bomb': points = -50; break;
  }
  
  // Pick random platform (except floor maybe? let's include all)
  const p = state.platforms[Math.floor(Math.random() * state.platforms.length)];
  const x = p.x + Math.random() * (p.width - 24);
  const y = p.y - 24; // slightly above platform

  state.items.push({
    id: Math.random().toString(36).substring(7),
    type,
    x, y,
    w: 24, h: 24,
    points
  });

  // Limit items
  if (state.items.length > 15) {
    state.items.shift();
  }
}

function updateGame() {
  if (!state.isPlaying) return;
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  if(dt > 0.1) dt = 0.1;
  lastTick = now;

  state.timeLeft -= dt * 1000;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.isPlaying = false;
  }

  const GRAVITY = 1800;
  const JUMP_FORCE = 850;
  const MOVE_SPEED = 350;

  // NPC LOGIC
  const npc = state.players.find(p => !p.isHuman);
  if (npc && state.isPlaying) {
    // Find closest positive item
    let target = state.items.filter(i => i.points > 0).sort((a,b) => {
      let d1 = Math.pow(a.x - npc.x, 2) + Math.pow(a.y - npc.y, 2);
      let d2 = Math.pow(b.x - npc.x, 2) + Math.pow(b.y - npc.y, 2);
      return d1 - d2;
    })[0];
    
    if (target) {
      if (target.x < npc.x - 10) npc.keys.left = true, npc.keys.right = false;
      else if (target.x > npc.x + 10) npc.keys.right = true, npc.keys.left = false;
      else npc.keys.left = false, npc.keys.right = false;

      // Simple jump logic if target is above or there's a gap
      if (target.y < npc.y - 40 && Math.random() < 0.05) npc.keys.jump = true;
      else npc.keys.jump = false;
    } else {
      npc.keys.left = false; npc.keys.right = false; npc.keys.jump = false;
    }
  }

  // Update players
  state.players.forEach(p => {
    // Horizontal move
    if (p.keys.left) p.vx = -MOVE_SPEED;
    else if (p.keys.right) p.vx = MOVE_SPEED;
    else p.vx = 0;

    // Jump
    if (p.keys.jump && p.onGround) {
      p.vy = -JUMP_FORCE;
      p.onGround = false;
    }

    p.vy += GRAVITY * dt;
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Screen wrap X
    if (p.x < -p.w) p.x = GAME_WIDTH;
    else if (p.x > GAME_WIDTH) p.x = -p.w;

    // Screen wrap Y (bottom boundary fall -> respawn top)
    if (p.y > GAME_HEIGHT) p.y = 0;

    // Platform collision
    p.onGround = false;
    for (let plat of state.platforms) {
      // Only check collision if falling down
      if (p.vy > 0) {
        let prevY = p.y - p.vy*dt;
        if (prevY + p.h <= plat.y && p.y + p.h >= plat.y) {
          if (p.x + p.w > plat.x && p.x < plat.x + plat.width) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }
    }

    // Item collision
    for (let i = state.items.length - 1; i >= 0; i--) {
      let it = state.items[i];
      if (p.x < it.x + it.w && p.x + p.w > it.x &&
          p.y < it.y + it.h && p.y + p.h > it.y) {
        // hit
        p.score += it.points;
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'effect', text: it.points > 0 ? `+${it.points}` : `${it.points}`, x: p.x, y: p.y, isBomb: it.type === 'bomb' }));
          }
        });
        state.items.splice(i, 1);
      }
    }
  });

  // Broadcast state
  const outState = {
    type: 'state',
    players: state.players,
    items: state.items,
    platforms: state.platforms,
    timeLeft: state.timeLeft,
    isPlaying: state.isPlaying
  };
  const msg = JSON.stringify(outState);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}


async function startServer() {
  const app = express();
  const server = http.createServer(app);
  global.wss = new WebSocketServer({ server });

  app.use(express.json());

  app.post('/api/login', async (req, res) => {
    const { id, pw } = req.body;
    try {
      const resp = await fetch('https://docs.google.com/spreadsheets/d/1FM6pUWt414vao1ePQps_D5KeXOFeg5UcZJFU2y5ox1o/gviz/tq?tqx=out:csv');
      const csv = await resp.text();
      // Simple parse
      const lines = csv.split(/\r?\n/);
      let found = false;
      for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols[1] === id && cols[2] === pw) {
          found = true;
          break;
        }
      }
      if (found) {
        res.json({ success: true, username: id });
      } else {
        res.json({ success: false, message: 'Invalid credentials.' });
      }
    } catch (e) {
      console.error(e);
      res.json({ success: false, message: 'Server error checking credentials.' });
    }
  });

  global.wss.on('connection', (ws) => {
    let currentUser = '';

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join') {
          currentUser = data.username;
          // Check if already 2 humans.
          let humans = state.players.filter(p => p.isHuman);
          if (humans.length >= 2) {
            // Kick one or reject? Let's just reset and allow. For now, max 2.
            // If already 2, this is a spectator or replaces someone.
          }
          
          // Remove NPC if exists
          state.players = state.players.filter(p => p.isHuman);
          
          if (!state.players.find(p => p.username === currentUser)) {
            state.players.push(spawnPlayer(currentUser, true));
          }

          // If 1 player, add NPC
          if (state.players.length === 1) {
            state.players.push(spawnPlayer('NPC_COM', false));
          }

          // Start or restart game
          resetGame();
          if (!gameLoopInterval) {
            gameLoopInterval = setInterval(updateGame, 1000 / 60); // 60hz
          }
          if (!itemSpawnInterval) {
            itemSpawnInterval = setInterval(spawnItem, 2000);
          }

        } else if (data.type === 'input') {
          let p = state.players.find(p => p.username === currentUser);
          if (p) {
            p.keys = data.keys;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    ws.on('close', () => {
      state.players = state.players.filter(p => p.username !== currentUser);
      // Re-add NPC if 1 player left
      if (state.players.length === 1 && state.players[0].isHuman) {
         state.players.push(spawnPlayer('NPC_COM', false));
      } else if (state.players.length === 0) {
         // Stop game
         if (gameLoopInterval) clearInterval(gameLoopInterval);
         if (itemSpawnInterval) clearInterval(itemSpawnInterval);
         gameLoopInterval = null;
         itemSpawnInterval = null;
         state.isPlaying = false;
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
