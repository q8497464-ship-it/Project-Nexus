import { useState, FormEvent } from "react";
import { Copy, Plus, ArrowRight, Compass, LogOut, Check, Heart } from "lucide-react";
import { Player } from "../types";
import { isFirebaseSupported } from "../lib/firebase";

interface RoomConnectionProps {
  currentUser: Player;
  onHostRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLogout: () => void;
  isConnecting: boolean;
  triggerAlert: (text: string, type: "success" | "info" | "error") => void;
  invitedRoomCode?: string | null;
}

export function getPersonalCode(user: Player): string {
  let code = "PAIR";
  if (user.email) {
    code = user.email.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
  } else if (user.name) {
    code = user.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  } else if (user.id) {
    code = user.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  
  if (code.length < 4) {
    code = code.padEnd(4, "X");
  }
  return code.substring(0, 8);
}

export default function RoomConnection({
  currentUser,
  onHostRoom,
  onJoinRoom,
  onLogout,
  isConnecting,
  triggerAlert,
  invitedRoomCode
}: RoomConnectionProps) {
  const [roomCode, setRoomCode] = useState(invitedRoomCode || "");
  const [mode, setMode] = useState<"choose" | "join">(invitedRoomCode ? "join" : "choose");
  const personalCode = getPersonalCode(currentUser);

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      triggerAlert("Please enter a room code", "error");
      return;
    }
    onJoinRoom(roomCode.trim().toUpperCase());
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-6" id="room-connection-screen">
      
      {/* Small Header */}
      <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 py-3 px-5 rounded-2xl" id="connection-gate-header">
        <div className="text-left">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Logged in as</span>
          <span className="text-xs font-semibold uppercase text-purple-400">{currentUser.name}</span>
          <span className="text-[10px] text-zinc-400 font-mono ml-1 px-1.5 py-0.5 rounded bg-white/5 font-light">
            {currentUser.gender === "male" ? "Him" : "Her"}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="text-zinc-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center my-2 flex flex-col items-center gap-1" id="couple-pairing-title">
        <div className="w-10 h-10 rounded-full bg-magenta-500/10 border border-magenta-500/30 flex items-center justify-center text-magenta-400 mb-2">
          <Heart className="w-5 h-5 animate-pulse" />
        </div>
        <h2 className="text-2xl font-light tracking-[0.15em] uppercase text-zinc-100">
          Establish Couple Link
        </h2>
        <p className="text-zinc-500 font-light text-xs max-w-xs leading-relaxed">
          Link your devices to synchronize choices, coin flips, and messages live.
        </p>
      </div>

      {/* Main choice glass card */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-6" id="connection-choice-card">
        
        {mode === "choose" ? (
          <div className="space-y-4" id="choose-action-panel">
            {/* Play on single device trigger */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] transition-all">
              <h3 className="text-xs font-mono font-medium text-zinc-300 tracking-wider uppercase mb-1">
                Start dynamic session
              </h3>
              <p className="text-[11px] text-zinc-500 font-light leading-relaxed mb-4">
                Be the connection anchor. Create a unique Room Code to share with your partner.
              </p>
              
              <button
                type="button"
                disabled={isConnecting}
                onClick={onHostRoom}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-sans text-xs tracking-[0.15em] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                id="btn-create-suite"
              >
                <Plus className="w-4 h-4" />
                {isConnecting ? "GENERATING..." : "HOST CURRENT SESSION"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 my-1" id="pairing-divider">
              <span className="h-[1px] w-full bg-white/10" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">or</span>
              <span className="h-[1px] w-full bg-white/10" />
            </div>

            {/* Display Personal Suite Code (Email-Based/User-Based) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/15 text-center space-y-1.5" id="personal-code-banner">
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#a855f7] uppercase block">
                Your Personal Suite Code
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-mono font-black tracking-widest text-pink-400 select-all uppercase">
                  {personalCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(personalCode);
                    triggerAlert("Your personal suite code copied! Share with your partner. 📱🎟️", "success");
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Copy your personal code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[9.5px] text-zinc-500 font-sans tracking-wide leading-relaxed font-light">
                Give this code to your partner. Alternatively, you can host below and have them join!
              </p>
            </div>

            {/* Enter partner's code */}
            <button
              type="button"
              onClick={() => setMode("join")}
              className="w-full bg-white/[0.02] hover:bg-white/[0.04] text-zinc-300 border border-white/10 font-mono text-[11px] tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
              id="switch-to-join-panel"
            >
              <Compass className="w-4 h-4 text-magenta-400" />
              ENTER PARTNER'S CODE
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4" id="join-form-element">
            {invitedRoomCode && invitedRoomCode === roomCode && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 text-center space-y-1" id="invite-detected-banner">
                <p className="text-[10px] font-mono font-bold tracking-widest text-[#c084fc] uppercase flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" /> Connection Invitation Detected
                </p>
                <p className="text-[9px] text-zinc-400 font-light font-mono leading-normal">
                  Code <span className="text-pink-400 font-bold font-mono text-[10px] select-all">{invitedRoomCode}</span> has been pre-filled from your shared partner invite link!
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2" id="join-code-field-wrapper">
              <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                Partner's Suite Code
              </label>
              <div className="relative flex rounded-xl overflow-hidden border border-white/10 focus-within:border-magenta-500 transition-all" id="input-room-code-wrap">
                <input
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g., KISSDUET, DATE74"
                  maxLength={12}
                  className="w-full bg-white/[0.02] text-sm font-mono tracking-[0.25em] text-center text-zinc-100 px-4 py-3.5 placeholder:text-zinc-700 placeholder:tracking-normal focus:outline-none"
                  id="target-room-code-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-magenta-600 to-rose-600 hover:from-magenta-500 hover:to-rose-500 text-white font-sans text-xs tracking-[0.15em] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              id="submit-room-join"
            >
              {isConnecting ? "ESTABLISHING SYNC..." : "JOIN SECTOR ROOM"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode("choose")}
              className="w-full text-center text-[10px] font-mono tracking-widest text-zinc-500 hover:text-zinc-300 py-1 transition-colors uppercase block"
              id="back-to-mode-btn"
            >
              ← Back to choosing
            </button>
          </form>
        )}

      </div>

      {/* Security notice and encryption footnote */}
      <div className="text-center text-[10px] text-zinc-600 leading-normal font-light px-6" id="connection-aes-disclaimer">
        End-to-End Real-time Sync ensures continuous pair synchronization. In sandbox environments, pairing defaults to high-fidelity cloud-twin simulation.
      </div>

    </div>
  );
}
