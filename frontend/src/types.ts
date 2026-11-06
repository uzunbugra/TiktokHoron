export type Player = { id: string; nickname: string; score: number };
export type MoveName = 'sol' | 'sag' | 'cok' | 'kalk';
export type GameState = {
  revision: number;
  players: Player[];
  waiting: number;
  capacity: number;
  leaderboard: Player[];
  move: { name: MoveName | null; revision: number };
  vote: { counts: Record<MoveName, number>; target: number };
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
