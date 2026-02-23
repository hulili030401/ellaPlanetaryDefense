export interface Point {
  x: number;
  y: number;
}

export interface Rocket {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  isDestroyed: boolean;
}

export interface Missile {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  isExploding: boolean;
  explosionRadius: number;
  maxExplosionRadius: number;
  explosionSpeed: number;
  isFinished: boolean;
}

export interface City {
  id: string;
  x: number;
  width: number;
  isDestroyed: boolean;
}

export interface Battery {
  id: string;
  x: number;
  missiles: number;
  maxMissiles: number;
  isDestroyed: boolean;
}

export type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST';

export interface MoneyParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  value: string;
}

export interface SparkleParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameState {
  score: number;
  status: GameStatus;
  rockets: Rocket[];
  missiles: Missile[];
  cities: City[];
  batteries: Battery[];
  moneyParticles: MoneyParticle[];
  sparkles: SparkleParticle[];
}
