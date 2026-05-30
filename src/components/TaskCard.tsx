import { motion } from "motion/react";
import { Sparkles, Trophy, AlertTriangle, Video, Image as ImageIcon, FileText, Mic } from "lucide-react";

interface TaskCardProps {
  type: "truth" | "dare";
  category: string;
  forGender: "male" | "female" | "all";
  text: string;
  penalty?: string;
  activePlayerName: string;
  isOwnerOfTurn: boolean;
  requiredMedia?: "text" | "image" | "video" | "audio";
}

export default function TaskCard({
  type,
  category,
  forGender,
  text,
  penalty,
  activePlayerName,
  isOwnerOfTurn,
  requiredMedia
}: TaskCardProps) {
  
  // Choose the dynamic glowing theme border and background gradient based on gender
  const getGenderStyles = () => {
    switch (forGender) {
      case "male":
        return {
          glow: "shadow-[0_0_40px_rgba(59,130,246,0.25)]",
          border: "border-blue-500/40",
          cardTitle: "text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]",
          badge: "bg-blue-500/10 text-blue-300 border-blue-500/30",
          avatarText: "HIS TURN",
          accentColor: "#3b82f6"
        };
      case "female":
        return {
          glow: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
          border: "border-rose-500/40",
          cardTitle: "text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]",
          badge: "bg-rose-500/10 text-rose-300 border-rose-500/30",
          avatarText: "HER TURN",
          accentColor: "#f43f5e"
        };
      default:
        return {
          glow: "shadow-[0_0_40px_rgba(139,92,246,0.25)]",
          border: "border-violet-500/40",
          cardTitle: "text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]",
          badge: "bg-violet-500/10 text-violet-300 border-violet-500/30",
          avatarText: "MUTUAL ACTION",
          accentColor: "#8b5cf6"
        };
    }
  };

  const styles = getGenderStyles();
  const isDare = type === "dare";

  return (
    <motion.div
      initial={{ 
        scale: 0.85, 
        opacity: 0, 
        y: 45,
        boxShadow: "0 0 0px rgba(0,0,0,0)",
        rotate: -2
      }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: [40, -6, 0],
        rotate: [2, -1, 0],
        boxShadow: isDare 
          ? [
              "0 0 10px rgba(244,63,94,0.1), 0 0 30px rgba(0,0,0,0.8)",
              `0 0 35px ${styles.accentColor}50, 0 0 40px rgba(0,0,0,0.8)`,
              `0 0 25px ${styles.accentColor}30, 0 0 45px rgba(0,0,0,0.85)`
            ]
          : [
              "0 0 10px rgba(139,92,246,0.1), 0 0 20px rgba(0,0,0,0.4)",
              `0 0 30px ${styles.accentColor}40, 0 0 35px rgba(0,0,0,0.5)`,
              `0 0 18px ${styles.accentColor}20, 0 0 30px rgba(0,0,0,0.45)`
            ]
      }}
      exit={{ scale: 0.85, opacity: 0, y: -45, rotate: 2 }}
      transition={{ 
        duration: 0.9, 
        ease: [0.19, 1, 0.22, 1] 
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.4}
      className={`relative w-full max-w-sm ${
        isDare 
          ? "rounded-[48px_16px_48px_16px] bg-gradient-to-b from-zinc-950/95 via-black/98 to-purple-950/20 shadow-[0_20px_50px_rgba(0,0,0,0.95)] border-2" 
          : "rounded-[24px_48px_24px_48px] bg-white/[0.03] shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-2"
      } ${styles.border} ${styles.glow} backdrop-blur-2xl p-4 sm:p-5 select-none overflow-hidden`}
      id="task-card-container"
    >
      {/* Absolute luxury corner bracket accents inside the card container to highlight design detail */}
      <div className="absolute top-3 left-3 w-4.5 h-4.5 border-t border-l opacity-40 select-none pointer-events-none rounded-tl-xl transition-all" style={{ borderColor: styles.accentColor }} />
      <div className="absolute top-3 right-3 w-4.5 h-4.5 border-t border-r opacity-40 select-none pointer-events-none rounded-tr-xl transition-all" style={{ borderColor: styles.accentColor }} />
      <div className="absolute bottom-3 left-3 w-4.5 h-4.5 border-b border-l opacity-40 select-none pointer-events-none rounded-bl-xl transition-all" style={{ borderColor: styles.accentColor }} />
      <div className="absolute bottom-3 right-3 w-4.5 h-4.5 border-b border-r opacity-40 select-none pointer-events-none rounded-br-xl transition-all" style={{ borderColor: styles.accentColor }} />
      {/* Dynamic Ticket Elements for Dare Cards */}
      {isDare && (
        <>
          {/* Top-right corner diagonal banner */}
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none z-10">
            <div 
              className="absolute top-2.5 -right-6.5 w-20 text-[6.5px] font-bold text-center tracking-widest text-white uppercase py-0.5 rotate-45 border-y border-white/10 shadow-md scale-95"
              style={{ backgroundColor: styles.accentColor }}
            >
              DARE
            </div>
          </div>
          
          {/* Left coupon punch notch */}
          <div 
            className="absolute top-[52px] -left-3 w-6 h-6 rounded-full bg-[#050505] border z-10 transition-all pointer-events-none" 
            style={{ 
              borderColor: styles.accentColor + "45",
              boxShadow: "inset -4px 0 6px rgba(0,0,0,0.95)"
            }}
          />
          {/* Right coupon punch notch */}
          <div 
            className="absolute top-[52px] -right-3 w-6 h-6 rounded-full bg-[#050505] border z-10 transition-all pointer-events-none" 
            style={{ 
              borderColor: styles.accentColor + "45",
              boxShadow: "inset 4px 0 6px rgba(0,0,0,0.95)"
            }}
          />
          {/* Perforated ticket separator line */}
          <div className="absolute top-[64px] left-3 right-3 border-t border-dashed border-white/10 pointer-events-none z-10" />
        </>
      )}

      {/* Background ambient lighting blobs */}
      <div 
        className="absolute -right-16 -top-16 w-32 h-32 rounded-full opacity-10 filter blur-xl pointer-events-none"
        style={{ backgroundColor: styles.accentColor }} 
        id="bg-light-blob-1"
      />
      <div 
        className="absolute -left-16 -bottom-16 w-32 h-32 rounded-full opacity-10 filter blur-xl pointer-events-none"
        style={{ backgroundColor: styles.accentColor }} 
        id="bg-light-blob-2"
      />

      {/* Card Header Tag */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="flex items-center justify-between mb-3" 
        id="card-header"
      >
        <span className={`text-[10px] uppercase font-mono tracking-[0.2em] px-2.5 py-1 rounded-full border ${styles.badge}`} id="card-badge">
          {category.replace("-", " ")}
        </span>
        
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase" id="card-author">
          {styles.avatarText}
        </span>
      </motion.div>

      {/* Core Vibe and Heading */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.6 }}
        className="text-center mb-3" 
        id="card-title-section"
      >
        <h3 className={`text-2xl font-light tracking-[0.15em] uppercase ${styles.cardTitle}`} id="card-direction">
          {type}
        </h3>
        <p className="text-xs font-mono text-zinc-400 mt-2 tracking-wide" id="card-active-player">
          For <span className="font-semibold text-zinc-200">{activePlayerName}</span>
        </p>
      </motion.div>

      {/* Card Body Display */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="min-h-20 flex items-center justify-center py-2 px-2" 
        id="card-body"
      >
        <p className="text-base text-center leading-relaxed font-sans font-light tracking-wide text-zinc-100/90" id="card-text">
          "{text}"
        </p>
      </motion.div>

      {/* Rejection / Penalty Area */}
      {penalty && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.6 }}
          className="mt-3.5 pt-3.5 border-t border-white/[0.06]" 
          id="card-penalty-box"
        >
          <div className="flex items-center gap-1.5 mb-2" id="penalty-header">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" id="penalty-icon" />
            <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-semibold">
              Penalty for rejection
            </span>
          </div>
          <p className="text-[11px] font-sans text-zinc-400 leading-normal font-light">
            {penalty}
          </p>
        </motion.div>
      )}

      {/* Required verification media banner */}
      {type === "dare" && requiredMedia && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.62, duration: 0.6 }}
          className="mt-3 px-3 py-2 bg-indigo-500/15 border border-indigo-500/25 rounded-2xl flex items-center gap-2 md:gap-2.5 shadow-sm" 
          id="card-proof-requirements"
        >
          {(requiredMedia === "video" || requiredMedia === "image") ? (
            <div className="flex items-center gap-1 shrink-0">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="text-[8px] text-indigo-400 font-mono">/</span>
              <Video className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            </div>
          ) : (
            <>
              {requiredMedia === "audio" && <Mic className="w-4 h-4 text-pink-400 animate-pulse shrink-0" />}
              {requiredMedia === "text" && <FileText className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />}
            </>
          )}
          
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-mono uppercase tracking-[0.1em] text-zinc-400 font-semibold leading-none">
              In-app Verification
            </span>
            <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-wider font-bold mt-1 leading-none">
              {(requiredMedia === "image" || requiredMedia === "video") ? "Photo or Video upload Required" : `${requiredMedia.toUpperCase()} uploading Required`}
            </span>
          </div>
        </motion.div>
      )}

      {/* Visual Spring instructions */}
      <div className="mt-3 text-center" id="card-footer-drag-hint">
        <span className="text-[8.5px] font-mono text-zinc-650 uppercase tracking-widest select-none pointer-events-none">
          ✦ Touch & drag card weight ✦
        </span>
      </div>
    </motion.div>
  );
}
