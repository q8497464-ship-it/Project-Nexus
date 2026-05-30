import { useState } from "react";
import { Copy, Plus, ArrowRight, Smartphone, Compass } from "lucide-react";

interface PartnerConnectProps {
  onJoinLocal: (name: string, gender: "male" | "female" | "all") => void;
  onHostOnline: (name: string, gender: "male" | "female" | "all", customRoomCode?: string) => void;
  onJoinOnline: (name: string, gender: "male" | "female" | "all", roomCode: string) => void;
  isConnecting: boolean;
}

export default function PartnerConnect({
  onJoinLocal,
  onHostOnline,
  onJoinOnline,
  isConnecting
}: PartnerConnectProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "all">("male");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [showOnlineForm, setShowOnlineForm] = useState(false);

  const handleCreateLocal = () => {
    const finalName = name.trim() || (gender === "male" ? "Him" : gender === "female" ? "Her" : "Love");
    onJoinLocal(finalName, gender);
  };

  const handleCreateOnline = () => {
    const finalName = name.trim() || (gender === "male" ? "Him" : gender === "female" ? "Her" : "Host Partner");
    onHostOnline(finalName, gender);
  };

  const handleJoinOnline = () => {
    if (!roomCodeInput.trim()) return;
    const finalName = name.trim() || (gender === "male" ? "Him" : gender === "female" ? "Her" : "Guest Partner");
    onJoinOnline(finalName, gender, roomCodeInput.trim().toUpperCase());
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-6" id="connect-screen-root">
      
      {/* App Branding Splash */}
      <div className="text-center mt-4 mb-2 flex flex-col items-center gap-1" id="app-splash-branding">
        <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-violet-600 via-purple-600 to-rose-500 p-[1.5px] shadow-[0_0_20px_rgba(147,51,234,0.4)] mb-3">
          <div className="w-full h-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
            <span className="text-xl font-sans font-extralight tracking-widest text-transparent bg-clip-text bg-linear-to-r from-violet-300 to-rose-300">
              T&D
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-light tracking-[0.2em] uppercase text-zinc-100 font-sans" id="brand-headline">
          Truth & Dare
        </h1>
        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.25em]" id="brand-subtext">
          Tech-Luxury Romance Edition
        </p>
      </div>

      {/* Connection Form Container */}
      <div className="bg-white/[0.02] border border-zinc-800/60 rounded-3xl p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-5" id="form-container">
        
        {/* Name inputs */}
        <div className="flex flex-col gap-2" id="input-group-name">
          <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Identify Yourself
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={gender === "male" ? "e.g., Brandon" : gender === "female" ? "e.g., Scarlett" : "e.g., Darling"}
            className="w-full bg-zinc-900/60 border border-zinc-800 text-sm font-light text-zinc-100 rounded-xl px-4 py-3 placeholder:text-zinc-600 focus:outline-hidden focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all"
            id="name-input"
          />
        </div>

        {/* Gender Choice Selection */}
        <div className="flex flex-col gap-2" id="input-group-role">
          <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Orientation Role
          </label>
          <div className="grid grid-cols-3 gap-2" id="role-selector-grid">
            <button
              type="button"
              onClick={() => setGender("male")}
              className={`py-3 px-2 rounded-xl text-xs font-mono tracking-wider transition-all border ${
                gender === "male"
                  ? "bg-blue-500/10 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-800"
              }`}
              id="role-btn-him"
            >
              HIM
            </button>
            <button
              type="button"
              onClick={() => setGender("female")}
              className={`py-3 px-2 rounded-xl text-xs font-mono tracking-wider transition-all border ${
                gender === "female"
                  ? "bg-rose-500/10 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-800"
              }`}
              id="role-btn-her"
            >
              HER
            </button>
            <button
              type="button"
              onClick={() => setGender("all")}
              className={`py-3 px-2 rounded-xl text-xs font-mono tracking-wider transition-all border ${
                gender === "all"
                  ? "bg-violet-500/10 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-800"
              }`}
              id="role-btn-both"
            >
              HIM & HER
            </button>
          </div>
        </div>

        {/* Action Blocks */}
        {!showOnlineForm ? (
          <div className="flex flex-col gap-3 mt-2" id="action-selection-panel">
            {/* Quick Play locally */}
            <button
              type="button"
              onClick={handleCreateLocal}
              className="w-full bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-zinc-100 font-sans text-xs tracking-[0.15em] font-medium py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
              id="btn-play-local"
            >
              <Smartphone className="w-4 h-4" />
              PLAY ON THIS DEVICE
            </button>

            <div className="flex items-center justify-center gap-4 my-1" id="divider-connect">
              <span className="h-[1px] w-full bg-zinc-800/40" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                OR
              </span>
              <span className="h-[1px] w-full bg-zinc-800/40" />
            </div>

            {/* Switch to Online Pairing Mode */}
            <button
              type="button"
              onClick={() => setShowOnlineForm(true)}
              className="w-full bg-zinc-950/60 hover:bg-zinc-950 hover:border-zinc-700 text-zinc-300 font-mono text-[11px] tracking-widest border border-zinc-800/80 py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              id="btn-show-online"
            >
              <Compass className="w-4 h-4 text-violet-400" />
              PAIR ONLINE WITH PARTNER
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2" id="online-pairing-fields">
            {/* Host room online */}
            <button
              type="button"
              disabled={isConnecting}
              onClick={handleCreateOnline}
              className="w-full bg-linear-to-r from-violet-600 to-rose-500 hover:from-violet-500 hover:to-rose-400 text-zinc-100 font-sans text-xs tracking-[0.15em] font-medium py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)] disabled:opacity-50"
              id="btn-host-online"
            >
              <Plus className="w-4 h-4" />
              {isConnecting ? "CREATING GAME..." : "HOST AN INTIMATE ROOM"}
            </button>

            <div className="flex items-center justify-center gap-4 my-1" id="divider-join">
              <span className="h-[1px] w-full bg-zinc-800/40" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                OR JOIN
              </span>
              <span className="h-[1px] w-full bg-zinc-800/40" />
            </div>

            {/* Join Room online with code */}
            <div className="flex flex-col gap-2" id="join-wrapper-code">
              <div className="relative flex rounded-xl overflow-hidden" id="join-input-group">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="ENTER 4-LETTER CODE"
                  maxLength={10}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-xs font-mono tracking-[0.2em] text-zinc-100 rounded-xl px-4 py-3.5 placeholder:text-zinc-700 placeholder:tracking-normal focus:outline-hidden focus:border-rose-500/50 transition-all text-center pr-12"
                  id="join-code-input"
                />
                <button
                  type="button"
                  disabled={isConnecting || !roomCodeInput.trim()}
                  onClick={handleJoinOnline}
                  className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-zinc-950 text-rose-400 hover:text-rose-300 hover:bg-zinc-900 flex items-center justify-center transition-all disabled:opacity-30"
                  id="btn-submit-code"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Back button */}
            <button
              type="button"
              onClick={() => setShowOnlineForm(false)}
              className="text-center text-[10px] font-mono tracking-widest text-zinc-500 hover:text-zinc-300 py-1 uppercase mt-1"
              id="btn-cancel-online"
            >
              ← Back to Device Mode
            </button>
          </div>
        )}
      </div>

      {/* Aesthetic Privacy Footnote */}
      <div className="text-center text-[10px] text-zinc-600 leading-relaxed font-light px-6" id="aes-connect-footnote">
        Pairs devices in real-time. Direct end-to-end game state encryption. No message history stored on public logs.
      </div>
    </div>
  );
}
