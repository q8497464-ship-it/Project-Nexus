import { useState, useEffect } from "react";
import { motion, useAnimation } from "motion/react";
import { CoinState, CoinResult } from "../types";

interface CoinFlip3DProps {
  coinState: CoinState;
  coinResult: CoinResult;
  onFlip: () => void;
  disabled?: boolean;
}

export default function CoinFlip3D({ coinState, coinResult, onFlip, disabled = false }: CoinFlip3DProps) {
  const controls = useAnimation();
  const [localSide, setLocalSide] = useState<"truth" | "dare">("truth");

  useEffect(() => {
    if (coinState === "flipping") {
      // Create a long 3D spin rotation (multiple 360-degree rotations + landing angle)
      const targetRotation = 1440 + (coinResult === "dare" ? 180 : 0);
      
      controls.start({
        rotateY: targetRotation,
        scale: [1, 1.25, 1.1, 1],
        transition: { 
          duration: 1.8, 
          ease: "easeInOut" 
        }
      }).then(() => {
        setLocalSide(coinResult === "dare" ? "dare" : "truth");
      });
    } else if (coinState === "idle") {
      // Reset rotation when state is idle
      controls.set({ rotateY: 0 });
      setLocalSide("truth");
    } else if (coinState === "landed") {
      // Instantly position correctly if loaded in landed state
      controls.set({ rotateY: coinResult === "dare" ? 180 : 0 });
      setLocalSide(coinResult === "dare" ? "dare" : "truth");
    }
  }, [coinState, coinResult, controls]);

  return (
    <div className="flex flex-col items-center justify-center py-2" id="coin-wrapper">
      {/* 3D Scene Wrapper */}
      <div 
        className="relative w-36 h-36 cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={!disabled && coinState === "idle" ? onFlip : undefined}
        id="coin-scene"
      >
        <motion.div
          animate={controls}
          initial={{ rotateY: 0 }}
          style={{ transformStyle: "preserve-3d" }}
          className="w-full h-full relative"
          id="coin-3d-body"
          whileHover={!disabled && coinState === "idle" ? { scale: 1.05, filter: "brightness(1.1)" } : {}}
          whileTap={!disabled && coinState === "idle" ? { scale: 0.95 } : {}}
        >
          {/* FRONT FACE: TRUTH (Visible at 0, 360, etc.) */}
          <div
            className="absolute inset-0 rounded-full border border-violet-500/40 bg-radial from-slate-900 via-zinc-950 to-zinc-950 flex flex-col items-center justify-center p-3 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            style={{ 
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            id="coin-face-truth"
          >
            {/* Cyber metallic rim */}
            <div className="absolute inset-1 rounded-full border border-dashed border-violet-500/20 animate-[spin_40s_linear_infinite]" />
            
            {/* Inner Core */}
            <div className="w-24 h-24 rounded-full bg-linear-to-b from-zinc-900 to-black border border-violet-500/30 flex items-center justify-center relative">
              <span className="text-lg font-sans tracking-[0.2em] font-light text-transparent bg-clip-text bg-linear-to-r from-violet-400 to-indigo-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]">
                TRUTH
              </span>
            </div>
          </div>

          {/* BACK FACE: DARE (Visible at 180, 540, etc.) */}
          <div
            className="absolute inset-0 rounded-full border border-rose-500/40 bg-radial from-slate-900 via-zinc-950 to-zinc-950 flex flex-col items-center justify-center p-3 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            style={{ 
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            id="coin-face-dare"
          >
            {/* Cyber metallic rim */}
            <div className="absolute inset-1 rounded-full border border-dashed border-rose-500/20 animate-[spin_40s_linear_infinite_reverse]" />
            
            {/* Inner Core */}
            <div className="w-24 h-24 rounded-full bg-linear-to-b from-zinc-900 to-black border border-rose-500/30 flex items-center justify-center">
              <span className="text-lg font-sans tracking-[0.2em] font-light text-transparent bg-clip-text bg-linear-to-r from-rose-400 to-pink-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]">
                DARE
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Control / Tutorial Text Hint */}
      <div className="mt-3 text-center" id="coin-hints-container">
        {coinState === "idle" && (
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
            {!disabled ? "Tap outer core to spin fate" : "Waiting for partner's spin..."}
          </p>
        )}
        {coinState === "flipping" && (
          <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest animate-pulse">
            Spinning destiny...
          </p>
        )}
        {coinState === "landed" && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Landed on
            </span>
            <span className={`text-sm font-semibold tracking-widest uppercase ${
              coinResult === "truth" 
                ? "text-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.4)]" 
                : "text-rose-400 drop-shadow-[0_0_4px_rgba(251,113,133,0.4)]"
            }`}>
              {coinResult}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
