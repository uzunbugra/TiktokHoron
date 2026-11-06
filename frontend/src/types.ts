export type Player = { id: string; nickname: string; score: number; region?: string | null };
export type MoveName = 'sol' | 'sag' | 'cok' | 'kalk';
export type GameState = {
  revision: number;
  players: Player[];
  waiting: number;
  capacity: number;
  leaderboard: Player[];
  move: { name: MoveName | null; revision: number };
  vote: { counts: Record<MoveName, number>; target: number };
  wave: { revision: number; support: number; target: number; status: 'idle' | 'active' | 'success' | 'failed' };
  leader: { id: string | null; revision: number };
  weather: { kind: 'clear' | 'sis' | 'yagmur' | 'firtina'; revision: number; support: number; target: number };
};
export type Gift = {
  type: 'gift';
  user_id: string;
  nickname: string;
  gift_id?: string;
  count: number;
  diamonds: number;
};
export type GameMessage = { state: GameState; effect: Gift | null };
