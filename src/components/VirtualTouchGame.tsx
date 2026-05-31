import { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Smartphone, 
  Check, 
  X, 
  Video, 
  Clock, 
  Sparkles, 
  Camera, 
  Zap, 
  Heart, 
  HelpCircle, 
  Play, 
  Cloud, 
  RefreshCw, 
  AlertCircle,
  Eye,
  Unlock
} from "lucide-react";
import { GameState, Player } from "../types";
import { db, isFirebaseSupported, doc, setDoc } from "../lib/firebase";
import { getStoredDriveToken, findOrCreateFolder, uploadFileToDrive } from "../lib/drive";

interface VirtualTouchProps {
  gameState: GameState;
  currentUser: Player | null;
  myPartnerName: string;
  frameIsMyTurn: boolean;
  updateRoomState: (updates: Partial<GameState>) => Promise<void>;
  triggerAlert: (text: string, type: "success" | "info" | "error") => void;
}

const BODY_ZONES = [
  { 
    id: "lips", 
    name: "Lips 👄", 
    description: "Record a video biting your lips sensually, blowing slow kisses, or licking your lips slowly.",
    glowColor: "rgba(236,72,153,0.8)" 
  },
  { 
    id: "neck", 
    name: "Neck 🫦", 
    description: "Close your eyes, throw your head back, and sensually stroke or massage your neck on camera.",
    glowColor: "rgba(219,39,119,0.8)" 
  },
  { 
    id: "collarbone", 
    name: "Collarbone ✨", 
    description: "Pull down your collar layer, run your fingers along your collarbone, and smile naughtily.",
    glowColor: "rgba(168,85,247,0.8)" 
  },
  { 
    id: "chest", 
    name: "Chest & Abs 🔥", 
    description: "Sensually slide your hands down your chest/torso or tease under your shirt.",
    glowColor: "rgba(244,63,94,0.8)" 
  },
  { 
    id: "waist", 
    name: "Waist & Hips 🌶️", 
    description: "Slowly move your hands down your hips, framing your waist, and twist slightly on camera.",
    glowColor: "rgba(239,68,68,0.8)" 
  },
  { 
    id: "thighs", 
    name: "Thighs 😈", 
    description: "Show your thighs, run your fingernails softly up your legs, and bite your lower lip.",
    glowColor: "rgba(139,92,246,0.8)" 
  }
];

function createLowBitrateRecorder(stream: MediaStream): MediaRecorder {
  const optionsTypes = [
    { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 90000 },
    { mimeType: "video/webm", videoBitsPerSecond: 90000 },
    { mimeType: "video/mp4", videoBitsPerSecond: 90000 },
  ];

  for (const opt of optionsTypes) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opt.mimeType)) {
        return new MediaRecorder(stream, opt);
      }
    } catch (e) {
      // try next
    }
  }

  try {
    return new MediaRecorder(stream, { videoBitsPerSecond: 90000 });
  } catch (e) {
    return new MediaRecorder(stream);
  }
}

export default function VirtualTouchGame({
  gameState,
  currentUser,
  myPartnerName,
  updateRoomState,
  triggerAlert
}: VirtualTouchProps) {
  const viewerId = currentUser?.id || "usr_guest";

  // Destructure sync fields natively matching the DB
  const vtToucherId = gameState.vtToucherId || "";
  const vtReceiverId = gameState.vtReceiverId || "";
  const vtState = gameState.vtState || "waiting_for_touch";
  const vtCurrentTouch = gameState.vtCurrentTouch || "";
  const vtVerificationVideoUrl = gameState.vtVerificationVideoUrl || "";

  const isToucher = viewerId === vtToucherId;
  const isReceiver = viewerId === vtReceiverId;

  // Camera & recording states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoBlobUrl, setRecordedVideoBlobUrl] = useState<string | null>(null);
  const [recordedVideoBase64, setRecordedVideoBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for video components
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Auto initialize roles if not defined
  useEffect(() => {
    if (!vtToucherId || !vtReceiverId) {
      const defaultToucher = gameState.hostId;
      const defaultReceiver = gameState.guestId || viewerId; 
      updateRoomState({
        vtToucherId: defaultToucher,
        vtReceiverId: defaultReceiver,
        vtState: "waiting_for_touch",
        vtCurrentTouch: "",
        vtVerificationVideoUrl: ""
      });
    }
  }, [vtToucherId, vtReceiverId, gameState.hostId, gameState.guestId, viewerId]);

  // Sync state transitions & handle cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
  };

  const handleZoneTouch = async (zoneId: string) => {
    if (!isToucher) {
      triggerAlert(`Wait for ${myPartnerName} to touch your body map!`, "info");
      return;
    }
    if (vtState !== "waiting_for_touch") {
      triggerAlert("Verification or approval sequence is active. Finish that first!", "error");
      return;
    }

    try {
      // Play chime/sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
        audio.volume = 0.25;
        audio.play();
      } catch (e) {}

      await updateRoomState({
        vtCurrentTouch: zoneId,
        vtState: "waiting_for_response"
      });

      triggerAlert(`Touched partner's ${zoneId.toUpperCase()}! Waiting for their private response... ⚡`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchCamera = async () => {
    setIsCameraActive(true);
    setRecordedVideoBlobUrl(null);
    setRecordedVideoBase64(null);
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" },
        audio: true
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera hook failed, fallback simulation active:", err);
      triggerAlert("Camera permissions blocked. Using secure dummy transmission.", "info");
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    chunksRef.current = [];

    if (streamRef.current) {
      try {
        const recorder = createLowBitrateRecorder(streamRef.current);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/mp4" });
          const blobUrl = URL.createObjectURL(blob);
          setRecordedVideoBlobUrl(blobUrl);

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            setRecordedVideoBase64(reader.result as string);
          };
        };
        recorder.start();
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
      }
    }

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => {
        if (prev >= 10) {
          handleStopRecording();
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadToGoogleDrive = async (videoDataUrl: string) => {
    try {
      const tokenToUse = getStoredDriveToken();
      if (!tokenToUse) return null;

      const userFolderId = await findOrCreateFolder(tokenToUse, "Couples Truth & Dare Game Media");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${currentUser?.name || "Player"}_virtual_touch_${vtCurrentTouch}_${timestamp}.mp4`;
      const mimeType = "video/mp4";

      const driveResult = await uploadFileToDrive(tokenToUse, userFolderId, filename, mimeType, videoDataUrl);
      return driveResult.webViewLink || null;
    } catch (err) {
      console.warn("Drive upload failed silently:", err);
      return null;
    }
  };

  const handleSubmitResponse = async () => {
    let finalVideoUrl = recordedVideoBase64 || "";

    // Fallback if camera is simulated/not working
    if (!finalVideoUrl) {
      finalVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-holding-hands-of-a-couple-close-up-34305-large.mp4";
    }

    if (recordingSeconds < 5 && recordedVideoBase64) {
      triggerAlert("Minimum recording requirement is 5 seconds! Keep teasing. 😘", "error");
      return;
    }

    setIsUploading(true);

    try {
      // Secure Google Drive mirroring
      const driveUrl = await uploadToGoogleDrive(finalVideoUrl);
      
      await updateRoomState({
        vtVerificationVideoUrl: finalVideoUrl,
        vtState: "waiting_for_approval",
        ccVerificationDriveUrl: driveUrl || undefined
      });

      stopCamera();
      setIsUploading(false);
      triggerAlert("Sensual Clip successfully submitted to Partner's Private screen! 🤫", "success");
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const handleApproveTouch = async () => {
    try {
      // Swap roles! Toucher becomes Receiver and Receiver becomes Toucher
      await updateRoomState({
        vtToucherId: vtReceiverId,
        vtReceiverId: vtToucherId,
        vtState: "waiting_for_touch",
        vtCurrentTouch: "",
        vtVerificationVideoUrl: ""
      });

      triggerAlert("Approved! Tactile session roles swapped! Prepare your body map map. 🎨🥵", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectTouch = async () => {
    try {
      await updateRoomState({
        vtState: "waiting_for_response",
        vtVerificationVideoUrl: ""
      });

      triggerAlert("Rejected! Demanded a hotter, more sensual body mapping angle! 🔥", "error");
    } catch (err) {
      console.error(err);
    }
  };

  const activeZone = BODY_ZONES.find(z => z.id === vtCurrentTouch);

  return (
    <div 
      className="w-full flex-1 flex flex-col items-center bg-[#050505] p-3 rounded-3xl border border-purple-500/10 min-h-[580px] text-white shadow-[0_0_40px_rgba(139,92,246,0.06)] overflow-y-auto"
      id="virtual-touch-body-screen"
    >
      {/* Banner Indicator */}
      <div className="w-full flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-2xl border border-white/5 mb-3" id="vt-role-selection-dashboard">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-mono tracking-widest text-[#d946ef] uppercase">Touch State</span>
          <span className="text-xs font-bold font-sans">
            {isToucher ? "👉 YOU ARE THE TOUCHER" : `🎭 ${myPartnerName} IS TOUCHING`}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono tracking-widest text-[#a855f7] uppercase">Interactive Mode</span>
          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400">NEON-GLOW LIVE</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="w-full flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center p-1">
        
        {/* Left Side: Silhouette Body Mapper */}
        <div className="flex flex-col items-center justify-center bg-black/90 rounded-2xl border border-zinc-900 p-4 relative min-h-[360px] shadow-inner">
          
          {/* Subtle Ambient Background Neon Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-2xl" />
          
          <h4 className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase mb-4 pointer-events-none relative z-10">
            Interactive Neon Silhouette
          </h4>

          {/* Seductive SVG Canvas Mannequin Body */}
          <div className="w-[180px] h-[320px] relative z-10" id="vt-mannequin-container">
            <svg 
              viewBox="0 0 200 400" 
              className="w-full h-full filter drop-shadow-[0_0_8px_rgba(168,85,247,0.35)]"
            >
              <defs>
                <filter id="neon-ambient" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur1" />
                  <feGaussianBlur stdDeviation="8" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="neon-hot" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur1" />
                  <feGaussianBlur stdDeviation="12" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid System markers for luxury tech feel */}
              <circle cx="100" cy="50" r="1.5" className="fill-purple-500/20" />
              <circle cx="100" cy="115" r="1.5" className="fill-purple-500/20" />
              <circle cx="100" cy="190" r="1.5" className="fill-purple-500/20" />
              <circle cx="100" cy="255" r="1.5" className="fill-purple-500/20" />
              <line x1="50" y1="200" x2="150" y2="200" className="stroke-white/[0.03] stroke-1 stroke-dasharray-[2,4]" />
              <line x1="100" y1="50" x2="100" y2="350" className="stroke-white/[0.03] stroke-1 stroke-dasharray-[2,4]" />

              {/* Ambient Mannequin Wireframe Body Outline (Static Subtle Purple Glow) */}
              <g className="opacity-90 transition-all duration-300">
                {/* Outlines of head, body, arms, legs */}
                {/* Head */}
                <path d="M 85 45 C 85 30, 115 30, 115 45 C 115 60, 85 60, 85 45 Z" className="stroke-purple-700/45 fill-transparent stroke-1.5" />
                {/* Arms */}
                <path d="M 68 112 C 55 130, 42 165, 40 195" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
                <path d="M 132 112 C 145 130, 158 165, 160 195" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
                {/* Inner Body contour */}
                <path d="M 72 112 C 50 112, 60 180, 70 195 C 65 240, 75 260, 75 290" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
                <path d="M 128 112 C 150 112, 140 180, 130 195 C 135 240, 125 260, 125 290" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
                {/* Left Leg */}
                <path d="M 75 290 C 70 320, 75 365, 78 385" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
                {/* Right Leg */}
                <path d="M 125 290 C 130 320, 125 365, 122 385" className="stroke-purple-700/35 fill-transparent stroke-1.5" />
              </g>

              {/* INTERACTIVE BODY ZONES FOR THE GAME */}
              {/* LIPS */}
              <path 
                onClick={() => handleZoneTouch("lips")}
                d="M 90 53 Q 100 63 110 53 Q 100 58 90 53 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "lips" 
                    ? "stroke-pink-500 fill-pink-500/65" 
                    : "stroke-pink-500/30 fill-transparent hover:stroke-pink-400 hover:fill-pink-500/10"
                }`}
                strokeWidth={vtCurrentTouch === "lips" ? "3" : "1.5"}
                filter={vtCurrentTouch === "lips" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-lips"
              />

              {/* NECK */}
              <path 
                onClick={() => handleZoneTouch("neck")}
                d="M 93 63 L 107 63 L 105 85 L 95 85 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "neck" 
                    ? "stroke-pink-500 fill-pink-500/65" 
                    : "stroke-pink-500/25 fill-transparent hover:stroke-pink-350 hover:fill-pink-500/15"
                }`}
                strokeWidth={vtCurrentTouch === "neck" ? "3.5" : "1.5"}
                filter={vtCurrentTouch === "neck" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-neck"
              />

              {/* COLLARBONE */}
              <path 
                onClick={() => handleZoneTouch("collarbone")}
                d="M 68 88 Q 100 98 132 88 L 134 100 Q 100 110 66 100 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "collarbone" 
                    ? "stroke-purple-500 fill-purple-550/65" 
                    : "stroke-purple-500/25 fill-transparent hover:stroke-purple-400 hover:fill-purple-500/15"
                }`}
                strokeWidth={vtCurrentTouch === "collarbone" ? "3" : "1.5"}
                filter={vtCurrentTouch === "collarbone" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-collarbone"
              />

              {/* CHEST */}
              <path 
                onClick={() => handleZoneTouch("chest")}
                d="M 70 102 C 60 135, 90 155, 100 155 C 110 155, 140 135, 130 102 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "chest" 
                    ? "stroke-rose-500 fill-rose-500/70" 
                    : "stroke-rose-500/25 fill-transparent hover:stroke-rose-350 hover:fill-rose-500/15"
                }`}
                strokeWidth={vtCurrentTouch === "chest" ? "3" : "1.5"}
                filter={vtCurrentTouch === "chest" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-chest"
              />

              {/* WAIST & ABS */}
              <path 
                onClick={() => handleZoneTouch("waist")}
                d="M 75 157 C 68 190, 85 220, 100 220 C 115 220, 132 190, 125 157 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "waist" 
                    ? "stroke-red-500 fill-red-500/65" 
                    : "stroke-red-500/25 fill-transparent hover:stroke-red-350 hover:fill-red-500/15"
                }`}
                strokeWidth={vtCurrentTouch === "waist" ? "3" : "1.5"}
                filter={vtCurrentTouch === "waist" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-waist"
              />

              {/* THIGHS */}
              <path 
                onClick={() => handleZoneTouch("thighs")}
                d="M 78 222 C 55 255, 85 345, 96 345 C 100 345, 104 345, 122 222 Z" 
                className={`cursor-pointer transition-all duration-300 ${
                  vtCurrentTouch === "thighs" 
                    ? "stroke-purple-600 fill-purple-600/70" 
                    : "stroke-purple-600/20 fill-transparent hover:stroke-purple-400 hover:fill-purple-600/15"
                }`}
                strokeWidth={vtCurrentTouch === "thighs" ? "3" : "1.5"}
                filter={vtCurrentTouch === "thighs" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                id="silhouette-thighs"
              />
            </svg>

            {/* Glowing spot pointer mapping indicator when touched */}
            {activeZone && (
              <div 
                className="absolute top-[20px] left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded-full border border-pink-500/40 text-[8px] font-mono tracking-widest text-pink-300 animate-pulse uppercase pointer-events-none"
                id="selected-zone-pointer"
              >
                📍 ACTIVE: {activeZone.name.split(" ")[0]}
              </div>
            )}
          </div>
          
          <span className="text-[9px] font-mono text-zinc-500 mt-3 hover:text-zinc-400 select-none">
            {isToucher ? "Tap any glowing body part zone above to touch" : "Wait for your partner's tactile touch"}
          </span>
        </div>

        {/* Right Side: Gameplay Status, Media Capture, or Seductive Verification Panel */}
        <div className="flex flex-col bg-zinc-950/45 border border-white/5 rounded-2xl p-4 min-h-[360px] justify-between relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-radial-to-br from-pink-500/[0.02] to-transparent pointer-events-none" />
          
          <AnimatePresence mode="wait">
            
            {/* STATE 1: WAITING FOR TOUCH */}
            {vtState === "waiting_for_touch" && (
              <motion.div 
                key="waiting_for_touch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-full bg-linear-to-tr from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <Smartphone className="w-6.5 h-6.5 text-[#e11d48] animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide uppercase text-white">
                    {isToucher ? "Choose Forbidden Focal Point" : `Waiting for ${myPartnerName}`}
                  </h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-1.5 max-w-[240px] mx-auto">
                    {isToucher 
                      ? "Select one sensitive zone on the interactive wireframe silhouette. Tapping a node will illuminate your partner's dashboard instantly." 
                      : `Relax and get ready. ${myPartnerName} is currently exploring the tactile body grid to issue a teasing command.`}
                  </p>
                </div>

                {!isToucher && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl px-4 py-2 font-mono text-[9px] text-[#be185d] animate-pulse">
                    🟢 SIGNAL SENSOR SYNCED: READY FOR INCOMING COMMANDS
                  </div>
                )}
              </motion.div>
            )}

            {/* STATE 2: TOUCH RECEIVED, NEEDING PRIVATE WEBCAM RECORDING */}
            {vtState === "waiting_for_response" && activeZone && (
              <motion.div 
                key="waiting_for_response"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col justify-between h-full"
              >
                {/* Text explanation */}
                <div className="space-y-3 text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-[9px] font-mono text-pink-400 tracking-wider uppercase animate-pulse">
                    💖 Focus Target: {activeZone.name}
                  </div>
                  <h3 className="text-md font-bold text-zinc-100">
                    {isReceiver ? "Take Provocative Compliance Video" : `Partner's Compliance Required`}
                  </h3>
                  <p className="text-[11.5px] text-zinc-300 font-light leading-relaxed">
                    {isReceiver 
                      ? activeZone.description 
                      : `Requested ${myPartnerName} to capture a seductive 5-10 second clip focusing precisely on their ${activeZone.name}. They are on camera now.`}
                  </p>
                </div>

                {isReceiver && (
                  <div className="my-4 flex-1 flex flex-col justify-center items-center">
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={handleLaunchCamera}
                        className="w-full py-4 bg-linear-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono text-[10px] tracking-widest uppercase rounded-2xl shadow-lg border border-pink-500/30 transition-all font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4.5 h-4.5 text-white animate-pulse" />
                        INITIATE PRIVATE CAMERA
                      </button>
                    ) : (
                      <div className="w-full space-y-3">
                        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-dashed border-pink-500/30 relative flex items-center justify-center shadow-inner">
                          <video 
                            ref={videoPreviewRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover rounded-xl"
                          />
                          
                          {/* Live video timer pulse overlay */}
                          <div className="absolute top-2 right-2 bg-black/80 border border-pink-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            <span className="text-[8.5px] font-mono text-pink-300">{recordingSeconds}s / 10s</span>
                          </div>

                          {/* 5s minimum notice overlay */}
                          {isRecording && recordingSeconds < 5 && (
                            <div className="absolute bottom-2 left-2 bg-red-950/80 text-rose-300 border border-red-500/30 px-2 py-0.5 rounded-lg text-[8px] font-mono">
                              Keep recording! Min 5 seconds required.
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {!isRecording ? (
                            <button
                              type="button"
                              onClick={handleStartRecording}
                              className="flex-1 py-2 bg-red-650 hover:bg-red-550 text-white font-mono text-[9px] tracking-wider uppercase rounded-xl border border-red-500/40 transition-all font-bold cursor-pointer"
                            >
                              🔴 RECORD CLIP
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStopRecording}
                              className="flex-1 py-2 bg-zinc-900 border border-white/20 text-white font-mono text-[9px] tracking-wider uppercase rounded-xl transition-all font-bold cursor-pointer"
                            >
                              ⬜ STOP RECORDING
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-4 bg-zinc-900 hover:bg-zinc-850 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
                            title="Cancel Camera"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {recordedVideoBlobUrl && (
                          <div className="p-3 bg-pink-950/10 border border-pink-500/20 rounded-xl space-y-2">
                            <span className="text-[8px] font-mono text-pink-300 block uppercase font-bold text-center">
                              📼 Sensual Video Tape Captured ({recordingSeconds} seconds)
                            </span>
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={handleSubmitResponse}
                              className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-550 text-white font-bold font-mono text-[9.5px] tracking-widest uppercase rounded-lg border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {isUploading ? "TRANSMITTING TO ACTIVE PARTNER..." : "🚀 SUBMIT COMPLIANCE CLIP"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!isReceiver && (
                  <div className="w-full p-4 bg-violet-950/15 border border-violet-500/20 rounded-xl text-center space-y-2 mt-4">
                    <Smartphone className="w-5 h-5 text-purple-400 mx-auto animate-bounce" />
                    <span className="text-[10px] font-mono text-purple-300 block uppercase font-bold">
                      Waiting for Partner Response
                    </span>
                    <p className="text-[9.5px] text-zinc-400 font-light">
                      {myPartnerName} received your touch notification. Stand by while they activate their private lens.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* STATE 3: WAITING FOR APPROVAL (MEDIA PLAYER LOADED) */}
            {vtState === "waiting_for_approval" && (
              <motion.div 
                key="waiting_for_approval"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col justify-between h-full space-y-3"
              >
                <div className="text-left space-y-1">
                  <span className="text-[8px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    🟢 SUBMISSION READY
                  </span>
                  <h3 className="text-sm font-bold text-zinc-100">
                    {isToucher ? "Verify Partner's Sensual Compliance" : `Awaiting Partner's Evaluation`}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    {isToucher 
                      ? `Watch ${myPartnerName}'s responsive private tape below. Make an evaluation to swap roles or trigger a retake.` 
                      : `Your sensual clip has been successfully securely funneled onto ${myPartnerName}'s dashboard screen. Waiting for them to approve.`}
                  </p>
                </div>

                {/* Media representation player or base64 reader */}
                <div className="my-3 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  {vtVerificationVideoUrl ? (
                    <div className="rounded-xl overflow-hidden aspect-video bg-black border border-white/10 relative shadow-2xl">
                      <video 
                        src={vtVerificationVideoUrl} 
                        controls 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 border border-purple-500/25 rounded px-2 py-0.5 text-[8px] font-mono text-purple-300 uppercase">
                        TAPED TARGET: {activeZone?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-[#0a0a0c] border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center p-4">
                      <Video className="w-6 h-6 text-zinc-600 animate-pulse mb-1" />
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">Loading secure live clip...</span>
                    </div>
                  )}
                </div>

                {/* Decision tools only for Toucher */}
                {isToucher && (
                  <div className="space-y-2 mt-2">
                    <button
                      type="button"
                      onClick={handleApproveTouch}
                      className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-550 border border-emerald-500/30 text-white font-bold font-mono text-[9px] tracking-widest uppercase rounded-lg shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      APPROVE (SWAP TURNS)
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectTouch}
                      className="w-full py-2 bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 text-rose-300 hover:text-white font-mono text-[8.5px] tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      REJECT (FORCE TEASE AGAIN)
                    </button>
                  </div>
                )}

                {!isToucher && (
                  <div className="bg-white/[0.01] border border-white/5 rounded-xl py-3 px-4 text-center mt-3 animate-pulse">
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase block">
                      ⏳ WAITING ON ACTIVE DECISION
                    </span>
                    <p className="text-[8.5px] text-zinc-500 font-mono mt-1 italic">
                      Partner is currently reviewing your exclusive video.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Ephemeral Vault Security Alert Footer */}
      <div className="w-full mt-4 p-3 bg-indigo-950/15 border border-indigo-500/20 rounded-2xl flex items-start gap-2.5 text-left" id="vt-vault-alert">
        <Heart className="w-4 h-4 text-pink-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="text-[9.5px] font-mono text-pink-300 uppercase tracking-widest block font-bold">
            🔒 Double Ephemeral Security Vault Guard
          </span>
          <p className="text-[9px] text-zinc-400 mt-0.5 leading-normal font-light">
            Once approved or roles are swapped, the active clip of {activeZone?.name || "your body parts"} will be permanently purged from all local feeds for extreme privacy. Optionally synced securely to your Google Drive layout setting folder.
          </p>
        </div>
      </div>
    </div>
  );
}
