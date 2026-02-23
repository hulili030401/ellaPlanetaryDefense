/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, AlertTriangle, RefreshCcw, Zap } from 'lucide-react';
import { 
  Point, Rocket, Missile, City, Battery, GameStatus, GameState, MoneyParticle, SparkleParticle 
} from './types';
import { 
  GAME_WIDTH, GAME_HEIGHT, INITIAL_MISSILES_SIDE, INITIAL_MISSILES_MIDDLE,
  ROCKET_SPEED_MIN, ROCKET_SPEED_MAX, MISSILE_SPEED, EXPLOSION_MAX_RADIUS,
  EXPLOSION_SPEED, SCORE_PER_ROCKET, WIN_SCORE, CITY_WIDTH, BATTERY_WIDTH,
  COLORS 
} from './constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    status: 'START',
    rockets: [],
    missiles: [],
    cities: [
      { id: 'c1', x: 150, width: CITY_WIDTH, isDestroyed: false },
      { id: 'c2', x: 250, width: CITY_WIDTH, isDestroyed: false },
      { id: 'c3', x: 350, width: CITY_WIDTH, isDestroyed: false },
      { id: 'c4', x: 450, width: CITY_WIDTH, isDestroyed: false },
      { id: 'c5', x: 550, width: CITY_WIDTH, isDestroyed: false },
      { id: 'c6', x: 650, width: CITY_WIDTH, isDestroyed: false },
    ],
    batteries: [
      { id: 'b1', x: 50, missiles: INITIAL_MISSILES_SIDE, maxMissiles: INITIAL_MISSILES_SIDE, isDestroyed: false },
      { id: 'b2', x: 400, missiles: INITIAL_MISSILES_MIDDLE, maxMissiles: INITIAL_MISSILES_MIDDLE, isDestroyed: false },
      { id: 'b3', x: 750, missiles: INITIAL_MISSILES_SIDE, maxMissiles: INITIAL_MISSILES_SIDE, isDestroyed: false },
    ],
    moneyParticles: [],
    sparkles: [],
  });

  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  const lastRocketSpawn = useRef<number>(0);
  const requestRef = useRef<number>(null);

  const spawnRocket = useCallback(() => {
    const startX = Math.random() * GAME_WIDTH;
    const targets = [
      ...stateRef.current.cities.filter(c => !c.isDestroyed).map(c => ({ x: c.x, y: GAME_HEIGHT - 20 })),
      ...stateRef.current.batteries.filter(b => !b.isDestroyed).map(b => ({ x: b.x, y: GAME_HEIGHT - 20 }))
    ];

    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const speed = ROCKET_SPEED_MIN + Math.random() * (ROCKET_SPEED_MAX - ROCKET_SPEED_MIN);

    const newRocket: Rocket = {
      id: Math.random().toString(36).substr(2, 9),
      start: { x: startX, y: 0 },
      current: { x: startX, y: 0 },
      target: { x: target.x, y: target.y },
      speed: speed,
      isDestroyed: false,
    };

    setGameState(prev => ({
      ...prev,
      rockets: [...prev.rockets, newRocket]
    }));
  }, []);

  const initGame = useCallback(() => {
    setGameState({
      score: 0,
      status: 'PLAYING',
      rockets: [],
      missiles: [],
      cities: [
        { id: 'c1', x: 150, width: CITY_WIDTH, isDestroyed: false },
        { id: 'c2', x: 250, width: CITY_WIDTH, isDestroyed: false },
        { id: 'c3', x: 350, width: CITY_WIDTH, isDestroyed: false },
        { id: 'c4', x: 450, width: CITY_WIDTH, isDestroyed: false },
        { id: 'c5', x: 550, width: CITY_WIDTH, isDestroyed: false },
        { id: 'c6', x: 650, width: CITY_WIDTH, isDestroyed: false },
      ],
      batteries: [
        { id: 'b1', x: 50, missiles: INITIAL_MISSILES_SIDE, maxMissiles: INITIAL_MISSILES_SIDE, isDestroyed: false },
        { id: 'b2', x: 400, missiles: INITIAL_MISSILES_MIDDLE, maxMissiles: INITIAL_MISSILES_MIDDLE, isDestroyed: false },
        { id: 'b3', x: 750, missiles: INITIAL_MISSILES_SIDE, maxMissiles: INITIAL_MISSILES_SIDE, isDestroyed: false },
      ],
      moneyParticles: [],
      sparkles: [],
    });
    lastRocketSpawn.current = performance.now();
    // 立即生成第一枚火箭
    setTimeout(spawnRocket, 100);
  }, [spawnRocket]);

  const update = useCallback((time: number) => {
    // 无论是否在游戏中，都继续循环，防止逻辑中断
    requestRef.current = requestAnimationFrame(update);

    if (stateRef.current.status !== 'PLAYING') return;

    // Spawn rockets
    const spawnRate = Math.max(500, 2000 - (stateRef.current.score / 100) * 100);
    if (time - lastRocketSpawn.current > spawnRate) {
      spawnRocket();
      lastRocketSpawn.current = time;
    }

    setGameState(prev => {
      const nextRockets = prev.rockets.map(r => {
        const dx = r.target.x - r.start.x;
        const dy = r.target.y - r.start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / dist) * r.speed;
        const vy = (dy / dist) * r.speed;

        const nextX = r.current.x + vx;
        const nextY = r.current.y + vy;

        // Check if hit target
        if (nextY >= r.target.y) {
          // Check what was hit
          const hitCity = prev.cities.find(c => Math.abs(c.x - r.target.x) < 5 && !c.isDestroyed);
          const hitBattery = prev.batteries.find(b => Math.abs(b.x - r.target.x) < 5 && !b.isDestroyed);
          
          if (hitCity) hitCity.isDestroyed = true;
          if (hitBattery) hitBattery.isDestroyed = true;

          return { ...r, isDestroyed: true };
        }

        return { ...r, current: { x: nextX, y: nextY } };
      }).filter(r => !r.isDestroyed);

      const nextMissiles = prev.missiles.map(m => {
        if (m.isExploding) {
          const nextRadius = m.explosionRadius + EXPLOSION_SPEED;
          if (nextRadius >= m.maxExplosionRadius) {
            return { ...m, isFinished: true };
          }
          return { ...m, explosionRadius: nextRadius };
        }

        const dx = m.target.x - m.start.x;
        const dy = m.target.y - m.start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vx = (dx / dist) * MISSILE_SPEED;
        const vy = (dy / dist) * MISSILE_SPEED;

        const nextX = m.current.x + vx;
        const nextY = m.current.y + vy;

        // Check if reached target
        const distToTarget = Math.sqrt(Math.pow(m.target.x - nextX, 2) + Math.pow(m.target.y - nextY, 2));
        if (distToTarget < MISSILE_SPEED) {
          return { ...m, current: m.target, isExploding: true };
        }

        return { ...m, current: { x: nextX, y: nextY } };
      }).filter(m => !m.isFinished);

      // Collision detection: Explosions vs Rockets
      let scoreGain = 0;
      const newMoneyParticles: MoneyParticle[] = [];
      const newSparkles: SparkleParticle[] = [];

      const activeExplosions = nextMissiles.filter(m => m.isExploding);
      const finalRockets = nextRockets.map(r => {
        const hitByExplosion = activeExplosions.some(e => {
          const dist = Math.sqrt(Math.pow(r.current.x - e.current.x, 2) + Math.pow(r.current.y - e.current.y, 2));
          return dist < (e.explosionRadius + 5);
        });
        if (hitByExplosion) {
          scoreGain += SCORE_PER_ROCKET;
          
          // Add money particle
          newMoneyParticles.push({
            id: Math.random().toString(36).substr(2, 9),
            x: r.current.x,
            y: r.current.y,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 2,
            life: 1.0,
            value: `+${SCORE_PER_ROCKET}`
          });

          // Add firework sparkles
          const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            newSparkles.push({
              id: Math.random().toString(36).substr(2, 9),
              x: r.current.x,
              y: r.current.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.0,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 1 + Math.random() * 3
            });
          }

          return { ...r, isDestroyed: true };
        }
        return r;
      }).filter(r => !r.isDestroyed);

      // Update existing particles
      const updatedMoneyParticles = [...prev.moneyParticles, ...newMoneyParticles]
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0);

      const updatedSparkles = [...prev.sparkles, ...newSparkles]
        .map(s => ({
          ...s,
          x: s.x + s.vx,
          y: s.y + s.vy,
          vy: s.vy + 0.05, // light gravity
          life: s.life - 0.03
        }))
        .filter(s => s.life > 0);

      const newScore = prev.score + scoreGain;
      
      // Check Win/Loss
      let nextStatus = prev.status;
      if (newScore >= WIN_SCORE) {
        nextStatus = 'WON';
      } else if (prev.batteries.every(b => b.isDestroyed)) {
        nextStatus = 'LOST';
      }

      return {
        ...prev,
        score: newScore,
        status: nextStatus,
        rockets: finalRockets,
        missiles: nextMissiles,
        moneyParticles: updatedMoneyParticles,
        sparkles: updatedSparkles,
      };
    });
  }, [spawnRocket]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;

    // Clear
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Cities
    state.cities.forEach(city => {
      if (!city.isDestroyed) {
        ctx.fillStyle = COLORS.CITY;
        ctx.fillRect(city.x - city.width / 2, GAME_HEIGHT - 40, city.width, 30);
        // Windows
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(city.x - 15, GAME_HEIGHT - 35, 8, 8);
        ctx.fillRect(city.x + 7, GAME_HEIGHT - 35, 8, 8);
        ctx.fillRect(city.x - 15, GAME_HEIGHT - 22, 8, 8);
        ctx.fillRect(city.x + 7, GAME_HEIGHT - 22, 8, 8);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(city.x - city.width / 2, GAME_HEIGHT - 15, city.width, 5);
      }
    });

    // Draw Batteries
    state.batteries.forEach(battery => {
      if (!battery.isDestroyed) {
        ctx.fillStyle = COLORS.BATTERY;
        ctx.beginPath();
        ctx.moveTo(battery.x - BATTERY_WIDTH / 2, GAME_HEIGHT - 10);
        ctx.lineTo(battery.x, GAME_HEIGHT - 40);
        ctx.lineTo(battery.x + BATTERY_WIDTH / 2, GAME_HEIGHT - 10);
        ctx.fill();
        
        // Ammo count
        ctx.fillStyle = COLORS.TEXT;
        ctx.font = '10px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(battery.missiles.toString(), battery.x, GAME_HEIGHT - 5);
      } else {
        ctx.fillStyle = '#442200';
        ctx.beginPath();
        ctx.arc(battery.x, GAME_HEIGHT - 10, 15, 0, Math.PI, true);
        ctx.fill();
      }
    });

    // Draw Rockets
    state.rockets.forEach(rocket => {
      // Draw trail
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.current.x, rocket.current.y);
      ctx.stroke();

      // Draw rocket head with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff4444';
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(rocket.current.x, rocket.current.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw a small flame flicker
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(rocket.current.x, rocket.current.y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Missiles
    state.missiles.forEach(missile => {
      if (!missile.isExploding) {
        ctx.strokeStyle = COLORS.MISSILE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(missile.start.x, missile.start.y);
        ctx.lineTo(missile.current.x, missile.current.y);
        ctx.stroke();

        // Target X
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(missile.target.x - 5, missile.target.y - 5);
        ctx.lineTo(missile.target.x + 5, missile.target.y + 5);
        ctx.moveTo(missile.target.x + 5, missile.target.y - 5);
        ctx.lineTo(missile.target.x - 5, missile.target.y + 5);
        ctx.stroke();
      } else {
        // Enhanced Explosion (Firework style)
        const gradient = ctx.createRadialGradient(
          missile.current.x, missile.current.y, 0,
          missile.current.x, missile.current.y, missile.explosionRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 100, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(missile.current.x, missile.current.y, missile.explosionRadius, 0, Math.PI * 2);
        ctx.fill();

        // Add some inner sparkles to the explosion
        if (Math.random() > 0.3) {
          ctx.fillStyle = 'white';
          for (let i = 0; i < 3; i++) {
            const rx = (Math.random() - 0.5) * missile.explosionRadius;
            const ry = (Math.random() - 0.5) * missile.explosionRadius;
            ctx.fillRect(missile.current.x + rx, missile.current.y + ry, 2, 2);
          }
        }
      }
    });

    // Draw Sparkles
    state.sparkles.forEach(s => {
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Money Particles
    state.moneyParticles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#00ff00';
      ctx.fillText(p.value, p.x, p.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1.0;

    // UI Overlay
    ctx.fillStyle = COLORS.UI_ACCENT;
    ctx.font = '16px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score.toString().padStart(5, '0')}`, 20, 30);
    ctx.fillText(`TARGET: ${WIN_SCORE}`, 20, 55);

  }, []);

  useEffect(() => {
    const interval = setInterval(draw, 1000 / 60);
    return () => clearInterval(interval);
  }, [draw]);

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (stateRef.current.status !== 'PLAYING') return;
    
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 限制点击范围在游戏区域内
    if (y > GAME_HEIGHT - 50) return;

    // 查找最近且有弹药的炮台
    const availableBatteries = stateRef.current.batteries
      .filter(b => !b.isDestroyed && b.missiles > 0)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));

    if (availableBatteries.length === 0) return;

    const battery = availableBatteries[0];
    // 所有炮台现在都支持一发三弹
    const missilesToFire = Math.min(3, battery.missiles);

    const newMissiles: Missile[] = [];
    
    for (let i = 0; i < missilesToFire; i++) {
      let targetX = x;
      if (missilesToFire > 1) {
        // Spread shots for all batteries
        targetX = x + (i - 1) * 40;
      }
      
      newMissiles.push({
        id: Math.random().toString(36).substr(2, 9),
        start: { x: battery.x, y: GAME_HEIGHT - 40 },
        current: { x: battery.x, y: GAME_HEIGHT - 40 },
        target: { x: targetX, y },
        speed: MISSILE_SPEED,
        isExploding: false,
        explosionRadius: 0,
        maxExplosionRadius: EXPLOSION_MAX_RADIUS,
        explosionSpeed: EXPLOSION_SPEED,
        isFinished: false,
      });
    }

    setGameState(prev => ({
      ...prev,
      missiles: [...prev.missiles, ...newMissiles],
      batteries: prev.batteries.map(b => b.id === battery.id ? { ...b, missiles: b.missiles - missilesToFire } : b)
    }));
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-start p-4 font-mono overflow-y-auto select-none touch-none">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[800px] flex justify-between items-end mb-4 border-b border-white/10 pb-2"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
            <Zap className="text-yellow-400 fill-yellow-400" size={24} />
            TINA新星防御 <span className="text-sm font-normal text-white/40 ml-2">NOVA DEFENSE</span>
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">轨道拦截系统 v2.5 / ORBITAL INTERCEPTION</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/60 uppercase">当前得分 SCORE</div>
          <div className="text-2xl font-bold text-[#00ff00] tabular-nums">
            {gameState.score.toString().padStart(6, '0')}
          </div>
        </div>
      </motion.div>

      {/* Game Container */}
      <div 
        onPointerDown={handleCanvasClick}
        className="relative w-full max-w-[800px] aspect-[4/3] bg-black rounded-lg border border-white/20 shadow-2xl overflow-hidden group touch-none"
      >
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        </div>

        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState.status === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 sm:p-8 text-center z-20"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Shield className="text-blue-400 mb-4" size={48} />
              </motion.div>
              <h2 className="text-3xl sm:text-5xl font-black mb-2 tracking-tighter text-white">TINA新星防御</h2>
              <p className="text-white/60 mb-8 max-w-md text-sm sm:text-base">
                保护城市免受轨道火箭袭击。
                <br />
                使用导弹炮台拦截威胁。
                <br />
                <span className="text-yellow-400 font-bold mt-4 block animate-pulse">点击屏幕发射 / CLICK TO FIRE</span>
              </p>
              <button 
                onClick={initGame}
                className="px-10 py-4 bg-[#00ff00] text-black font-black rounded-sm hover:bg-white transition-all flex items-center gap-3 group uppercase tracking-tighter"
              >
                启动系统 START SYSTEM
                <Target className="group-hover:rotate-90 transition-transform" size={20} />
              </button>
            </motion.div>
          )}

          {gameState.status === 'WON' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-green-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-lg p-8 text-center z-20"
            >
              <Trophy className="text-yellow-400 mb-4 animate-bounce" size={64} />
              <h2 className="text-4xl sm:text-6xl font-black mb-2 tracking-tighter text-white">任务成功 SUCCESS</h2>
              <div className="h-1 w-32 bg-yellow-400 mb-4" />
              <p className="text-white/80 mb-8 text-lg">
                最终得分 Final Score: <span className="text-3xl font-bold text-yellow-400">{gameState.score}</span>
              </p>
              <button 
                onClick={initGame}
                className="px-8 py-3 bg-white text-black font-bold rounded-sm hover:bg-yellow-400 transition-colors flex items-center gap-2"
              >
                再次部署 RE-DEPLOY
                <RefreshCcw size={18} />
              </button>
            </motion.div>
          )}

          {gameState.status === 'LOST' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-lg p-8 text-center z-20"
            >
              <AlertTriangle className="text-red-500 mb-4 animate-pulse" size={64} />
              <h2 className="text-4xl sm:text-6xl font-black mb-2 tracking-tighter text-white">防御崩溃 FAILED</h2>
              <div className="h-1 w-32 bg-red-500 mb-4" />
              <p className="text-white/80 mb-8 text-lg">
                最终得分 Final Score: <span className="text-3xl font-bold text-red-500">{gameState.score}</span>
              </p>
              <button 
                onClick={initGame}
                className="px-8 py-3 bg-white text-black font-bold rounded-sm hover:bg-red-500 transition-colors flex items-center gap-2"
              >
                重新尝试 RETRY
                <RefreshCcw size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats - Compact Grid */}
      <div className="w-full max-w-[800px] grid grid-cols-3 gap-2 sm:gap-4 mt-3">
        {gameState.batteries.map((b, i) => (
          <div key={b.id} className={`p-2 sm:p-3 rounded border transition-all ${b.isDestroyed ? 'border-red-900/50 bg-red-950/10 opacity-40' : 'border-white/10 bg-white/5 shadow-inner'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-bold">炮台 B-0{i+1}</span>
              {b.isDestroyed ? <AlertTriangle size={10} className="text-red-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse" />}
            </div>
            <div className="flex items-baseline justify-between">
              <span className={`text-lg sm:text-2xl font-black tabular-nums ${b.isDestroyed ? 'text-red-900' : 'text-white'}`}>
                {b.isDestroyed ? 'OFF' : b.missiles}
              </span>
              {!b.isDestroyed && (
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div 
                      key={j} 
                      className={`w-1 sm:w-1.5 h-3 sm:h-4 rounded-sm ${j < (b.missiles / b.maxMissiles) * 5 ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-white/5'}`} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-white/10 text-[8px] uppercase tracking-[0.5em] flex items-center gap-4 select-none">
        <span>GRID_ACTIVE</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <span>TINA_PROTOCOL_V2</span>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <span>SECURE_LINK</span>
      </div>
    </div>
  );
}
