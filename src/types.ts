export type GameMode = "local" | "online";

export interface Player {
  id: string;
  name: string;
  gender: "male" | "female" | "all";
  email?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "text";
  driveSynced?: boolean;
  driveFileUrl?: string;
  filterId?: string;
}

export type CoinState = "idle" | "flipping" | "landed";
export type CoinResult = "truth" | "dare" | "";

export type ApprovalState = "idle" | "pending" | "approved" | "rejected";

export interface TaskCard {
  id: string;
  type: "truth" | "dare";
  category: "romantic" | "intimate" | "deep-romance";
  forGender: "male" | "female" | "all";
  text: string;
  penalty?: string;
  required_media?: "text" | "image" | "video" | "audio";
}

export interface GameState {
  id: string;
  roomCode: string;
  status: "waiting" | "active" | "ended";
  hostId: string;
  hostName: string;
  guestId?: string;
  guestName?: string;
  currentTurnPlayerId: string; // ID of player whose turn it is
  turnNumber: number;
  coinState: CoinState;
  coinResult: CoinResult;
  currentCard?: {
    id: string;
    type: "truth" | "dare";
    text: string;
    penalty?: string;
    required_media?: "text" | "image" | "video" | "audio";
  };
  approvalState: ApprovalState;
  approvedAt?: string;
  scoreHost: number;
  scoreGuest: number;
  selectedGameId?: string;
  lastActionBy?: string;
  lastActionTime?: string;
  truthState?: "waiting_for_question" | "waiting_for_answer" | "completed";
  usedCardIds?: string[];
  ccMasterId?: string;
  ccSubId?: string;
  ccState?: string;
  ccRequestRoleMasterHost?: boolean;
  ccRequestRoleMasterGuest?: boolean;
  ccCommandAudioUrl?: string;
  ccVerificationAudioUrl?: string;
  ccVerificationVideoUrl?: string;
  ccVerificationType?: string;
  ccSubEyesClosed?: boolean;
  ccSubRoomDark?: boolean;
  ccTimerTarget?: number;
  ccActiveSuggestion?: string;
  ccRound?: number;
  ccTimerStart?: number;
  ccScoreHost?: number;
  ccScoreGuest?: number;
  ccLoserNudeVideoUrl?: string;
  ccVerificationDriveUrl?: string;
  createdAt: string;
  updatedAt: string;
}

