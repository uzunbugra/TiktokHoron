export type Player = { id: string; nickname: string; score: number };
export type GameState = {
  revision: number;
  players: Player[];
  waiting: number;
  capacity: number;
  leaderboard: Player[];
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
