import { apiClient } from "./client";
import type { Question } from "./practice";
import type { Achievement } from "./profile";

export type GameRoomStatus = "waiting" | "running" | "finished";
export type StartCondition = "manual" | "timer" | "player_count";

export interface GameUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface GameParticipant {
  id: number;
  user: GameUser;
  score: number;
  rank: number | null;
  joined_at: string;
}

export interface GameRoom {
  id: number;
  creator: GameUser;
  name: string;
  room_code: string;
  type: "private" | "public";
  max_players: number;
  status: GameRoomStatus;
  start_time: string | null;
  created_at: string;
  participants: GameParticipant[];
  participant_count: number;
  start_condition: StartCondition;
  timer_seconds: number | null;
  min_players_to_start: number | null;
  scheduled_start_at: string | null;
}

export interface CreateRoomPayload {
  name: string;
  max_players: number;
  start_condition: StartCondition;
  timer_seconds?: number;
  min_players_to_start?: number;
}

export interface GameStats {
  games_played: number;
  wins: number;
  losses: number;
  points_earned: number;
}

export async function createRoom(payload: CreateRoomPayload): Promise<GameRoom> {
  const { data } = await apiClient.post("/games/rooms/", payload);
  return data;
}

export async function fetchMyRooms(): Promise<GameRoom[]> {
  const { data } = await apiClient.get("/games/rooms/mine/");
  return data;
}

export async function fetchRoom(roomCode: string): Promise<GameRoom> {
  const { data } = await apiClient.get(`/games/rooms/${roomCode}/`);
  return data;
}

export async function joinRoom(roomCode: string): Promise<GameRoom> {
  const { data } = await apiClient.post(`/games/rooms/${roomCode}/join/`);
  return data;
}

export async function leaveRoom(roomCode: string): Promise<void> {
  await apiClient.post(`/games/rooms/${roomCode}/leave/`);
}

export async function startRoom(roomCode: string): Promise<GameRoom> {
  const { data } = await apiClient.post(`/games/rooms/${roomCode}/start/`);
  return data;
}

export async function cancelRoom(roomCode: string): Promise<void> {
  await apiClient.delete(`/games/rooms/${roomCode}/cancel/`);
}

export async function kickParticipant(roomCode: string, userId: number): Promise<void> {
  await apiClient.delete(`/games/rooms/${roomCode}/participants/${userId}/`);
}

export async function fetchMyGameStats(): Promise<GameStats> {
  const { data } = await apiClient.get("/games/stats/me/");
  return data;
}

export type MatchmakingStartMode = "player_count" | "timer";
export type MatchmakingTicketStatus = "waiting" | "matched" | "cancelled";

export interface MatchmakingQueue {
  id: number;
  name: string;
  start_mode: MatchmakingStartMode;
  min_players: number;
  max_players: number;
  timer_seconds: number | null;
}

export interface MatchmakingTicket {
  id: number;
  queue: MatchmakingQueue;
  status: MatchmakingTicketStatus;
  room_code: string | null;
  room_status: GameRoomStatus | null;
  players_waiting: number;
  scheduled_start_at: string | null;
  created_at: string;
}

export async function fetchMatchmakingQueues(): Promise<MatchmakingQueue[]> {
  const { data } = await apiClient.get("/games/matchmaking/queues/");
  return data;
}

export async function findGame(queueId: number): Promise<MatchmakingTicket> {
  const { data } = await apiClient.post("/games/matchmaking/find/", { queue_id: queueId });
  return data;
}

export async function fetchMatchmakingStatus(): Promise<MatchmakingTicket[]> {
  const { data } = await apiClient.get("/games/matchmaking/status/");
  return data;
}

export async function cancelMatchmaking(queueId: number): Promise<void> {
  await apiClient.post("/games/matchmaking/cancel/", { queue_id: queueId });
}

export interface CurrentQuestionResponse {
  finished: boolean;
  room_status: GameRoomStatus;
  question?: Question;
  question_number?: number;
  total_questions: number;
  seconds_remaining?: number;
  time_limit_per_question?: number;
  score: number;
  rank?: number | null;
}

export interface SubmitGameAnswerPayload {
  question_id: number;
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
}

export interface SubmitGameAnswerResult {
  is_correct: boolean;
}

export async function fetchCurrentQuestion(roomCode: string): Promise<CurrentQuestionResponse> {
  const { data } = await apiClient.get(`/games/rooms/${roomCode}/play/current/`);
  return data;
}

export async function submitGameAnswer(
  roomCode: string,
  payload: SubmitGameAnswerPayload,
): Promise<SubmitGameAnswerResult> {
  const { data } = await apiClient.post(`/games/rooms/${roomCode}/play/answer/`, payload);
  return data;
}

export interface LeaderboardEntry {
  rank: number;
  user: GameUser;
  score: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  total_questions: number;
  accuracy_percentage: number;
  average_time_seconds: number | null;
}

export interface GameResults {
  leaderboard: LeaderboardEntry[];
  my_rank: number;
  xp_earned: number;
  newly_unlocked_achievements: Achievement[];
}

export async function fetchGameResults(roomCode: string): Promise<GameResults> {
  const { data } = await apiClient.get(`/games/rooms/${roomCode}/results/`);
  return data;
}
