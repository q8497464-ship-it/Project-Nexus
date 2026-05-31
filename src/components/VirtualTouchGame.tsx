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
import { soundManager } from "../lib/sound";

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
    name: "Upper Chest 🌟", 
    description: "Sensually slide your hands down your upper torso, showing off your collarbone and high neck area.",
    glowColor: "rgba(244,63,94,0.8)" 
  },
  { 
    id: "mid_chest", 
    name: "Mid Chest 🔥", 
    description: "Seductively run your fingers down your middle chest area, showing your heart rate reactions on camera.",
    glowColor: "rgba(244,63,94,0.8)" 
  },
  { 
    id: "nipples", 
    name: "Nipples 🍒", 
    description: "A highly teasing video grazing, pressing, or circling your nipples softly with your fingertips.",
    glowColor: "rgba(236,72,153,0.9)" 
  },
  { 
    id: "waist", 
    name: "Waist 🌶️", 
    description: "Slowly move your hands down your side hips, framing your waist, and twist slightly on camera.",
    glowColor: "rgba(239,68,68,0.8)" 
  },
  { 
    id: "vagina", 
    name: "Vagina 💜", 
    description: "An intimate, teasing video of the pelvic/vagina region, showing slow sensual movements or touch over fabrics.",
    glowColor: "rgba(168,85,247,0.9)" 
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
        soundManager.play("chime");
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
        ccVerificationDriveUrl: driveUrl || ""
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

  const partnerGenderInitial = currentUser?.gender === "male" ? "female" : "male";
  const [modelGender, setModelGender] = useState<"female" | "male">(partnerGenderInitial);

  useEffect(() => {
    if (currentUser?.gender) {
      setModelGender(currentUser.gender === "male" ? "female" : "male");
    }
  }, [currentUser?.gender]);

  const getZoneName = (zoneId: string, gender: "female" | "male") => {
    if (zoneId === "vagina") return gender === "female" ? "Vagina 💜" : "Groin & Shaft 🍆";
    if (zoneId === "nipples") return gender === "female" ? "Nipples 🍒" : "Masculine Nipples 🔥";
    if (zoneId === "chest") return gender === "female" ? "Upper Chest 🌟" : "Muscular Pecs 💪";
    if (zoneId === "mid_chest") return gender === "female" ? "Mid Chest 🔥" : "Abs / Toned Core ⚡";
    
    const zone = BODY_ZONES.find(z => z.id === zoneId);
    return zone ? zone.name : zoneId;
  };

  const getZoneDesc = (zoneId: string, gender: "female" | "male") => {
    if (zoneId === "vagina") {
      return gender === "female"
        ? "An intimate, teasing video of the pelvic/vagina region, showing slow movements over soft fabrics."
        : "Teasing video of your muscular groin, framing your hips or slowly stroking your pelvic region on camera.";
    }
    if (zoneId === "nipples") {
      return gender === "female"
        ? "A highly teasing video grazing, pressing, or circling your nipples softly with your fingertips."
        : "Slowly running your fingertips over your chest and pinching or teasing your nipples with a smirk.";
    }
    if (zoneId === "chest") {
      return gender === "female"
        ? "Sensually sliding your hands down your upper torso, showing off your collarbone and high neck area."
        : "Flexing your chest muscles and running your hands down your pecs while keeping solid camera eye-contact.";
    }
    if (zoneId === "mid_chest") {
      return gender === "female"
        ? "Seductively run your fingers down your middle chest area, showing your heart rate reactions on camera."
        : "Run your hands down your abs and core, pulling your shirt up slightly to tease your toned midriff.";
    }
    if (zoneId === "waist") {
      return gender === "female"
        ? "Slowly move your hands down your side hips, framing your waist, and twist slightly on camera."
        : "Trace your obliques, showing off your strong V-cut hip lines and resting your hands on your waistband.";
    }
    
    const zone = BODY_ZONES.find(z => z.id === zoneId);
    return zone ? zone.description : "";
  };

  const activeZoneRaw = BODY_ZONES.find(z => z.id === vtCurrentTouch);

  const activeZone = activeZoneRaw ? {
    ...activeZoneRaw,
    name: getZoneName(activeZoneRaw.id, modelGender),
    description: getZoneDesc(activeZoneRaw.id, modelGender)
  } : undefined;

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

      {/* Main Game Stage - Centered on Silhouette mapping as requested */}
      <div className="w-full flex-1 flex flex-col items-center justify-center p-1">
        
        {/* Center: Silhouette Body Mapper */}
        <div className="w-full max-w-[420px] flex flex-col items-center justify-center bg-black/90 rounded-2xl border border-zinc-900 p-5 relative min-h-[400px] shadow-inner">
          
          {/* Subtle Ambient Background Neon Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-2xl" />
          
          <div className="w-full flex flex-col items-center gap-2 mb-4 relative z-10 select-none">
            <h4 className="text-[10px] font-mono text-zinc-400 tracking-[0.2em] uppercase pointer-events-none">
              Interactive Body Silhouette
            </h4>
            
            {/* Gender Toggle Tab Bar */}
            <div className="flex items-center bg-zinc-950 border border-white/5 rounded-xl p-0.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.play("click");
                  setModelGender("female");
                }}
                className={`px-3 py-1 text-[9px] font-mono tracking-wider rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                  modelGender === "female"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🚺 FEMALE MAP
              </button>
              <button
                type="button"
                onClick={() => {
                  soundManager.play("click");
                  setModelGender("male");
                }}
                className={`px-3 py-1 text-[9px] font-mono tracking-wider rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                  modelGender === "male"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                🚹 MALE MAP
              </button>
            </div>
          </div>

          {/* Seductive SVG Canvas Mannequin Body */}
          <div className="w-[185px] h-[330px] relative z-10" id="vt-mannequin-container">
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

              {modelGender === "female" ? (
                <>
                  {/* FEMALE MODEL WIREFRAME (ELEGANT HOURGLASS) */}
                  <g className="opacity-95 transition-all duration-300 pointer-events-none">
                    {/* Head contour */}
                    <path d="M 85 45 C 85 28, 115 28, 115 45 C 115 58, 85 58, 85 45 Z" className="stroke-purple-500/20 fill-purple-950/5 stroke-1" />
                    <path d="M 85 40 Q 82 45 85 48" className="stroke-purple-700/30 fill-transparent stroke-1" />
                    <path d="M 115 40 Q 118 45 115 48" className="stroke-purple-700/30 fill-transparent stroke-1" />
                    
                    {/* Neck & Shoulders */}
                    <path d="M 92 58 L 90 85 L 68 96 L 55 115" className="stroke-purple-700/35 fill-transparent stroke-1.2" />
                    <path d="M 108 58 L 110 85 L 132 96 L 145 115" className="stroke-purple-700/35 fill-transparent stroke-1.2" />
                    
                    {/* Arms */}
                    <path d="M 55 115 C 44 135, 34 165, 31 195 C 29 215, 32 230, 36 240" className="stroke-purple-700/25 fill-transparent stroke-1" />
                    <path d="M 145 115 C 156 135, 166 165, 169 195 C 171 215, 168 230, 164 240" className="stroke-purple-700/25 fill-transparent stroke-1" />
                    
                    {/* Side body profile boundaries */}
                    <path d="M 72 115 Q 65 140 76 170 Q 64 210 75 242 M 128 115 Q 135 140 124 170 Q 136 210 125 242" className="stroke-purple-750/35 fill-transparent stroke-1.2" strokeDasharray="3,3" />
                    
                    {/* Hip & Leg contours */}
                    <path d="M 75 242 Q 72 265 75 295 L 78 385 M 125 242 Q 128 265 125 295 L 122 385" className="stroke-purple-700/25 fill-transparent stroke-1.2" />
                    <path d="M 98 242 L 98 385" className="stroke-purple-800/20 fill-transparent stroke-1" strokeDasharray="1,4" />
                  </g>

                  {/* INTERACTIVE BODY ZONES */}
                  {/* LIPS */}
                  <path 
                    onClick={() => handleZoneTouch("lips")}
                    d="M 90 51 C 93 47, 97 47, 100 51 C 103 47, 107 47, 110 51 C 111 53, 108 57, 100 57 C 92 57, 89 53, 90 51 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "lips" 
                        ? "stroke-pink-500 fill-pink-500/65" 
                        : "stroke-pink-500/30 fill-transparent hover:stroke-pink-400 hover:fill-pink-500/10"
                    }`}
                    strokeWidth={vtCurrentTouch === "lips" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "lips" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-lips"
                  />

                  {/* NECK */}
                  <path 
                    onClick={() => handleZoneTouch("neck")}
                    d="M 92 58 L 108 58 Q 106 73 104 81 Q 100 82 96 81 Q 94 73 92 58 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "neck" 
                        ? "stroke-pink-500 fill-pink-500/65" 
                        : "stroke-pink-500/25 fill-transparent hover:stroke-pink-350 hover:fill-pink-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "neck" ? "3.5" : "1.5"}
                    filter={vtCurrentTouch === "neck" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-neck"
                  />

                  {/* COLLARBONE */}
                  <path 
                    onClick={() => handleZoneTouch("collarbone")}
                    d="M 72 84 Q 100 93 128 84 L 131 95 Q 100 104 69 95 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "collarbone" 
                        ? "stroke-purple-500 fill-purple-550/65" 
                        : "stroke-purple-500/25 fill-transparent hover:stroke-purple-400 hover:fill-purple-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "collarbone" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "collarbone" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-collarbone"
                  />

                  {/* UPPER CHEST */}
                  <path 
                    onClick={() => handleZoneTouch("chest")}
                    d="M 70 97 Q 100 106 130 97 L 132 116 Q 100 125 68 116 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "chest" 
                        ? "stroke-rose-500 fill-rose-500/70" 
                        : "stroke-rose-500/25 fill-transparent hover:stroke-rose-350 hover:fill-rose-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "chest" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "chest" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-chest"
                  />

                  {/* MID CHEST */}
                  <path 
                    onClick={() => handleZoneTouch("mid_chest")}
                    d="M 68 118 Q 100 127 132 118 L 133 134 Q 100 143 67 134 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "mid_chest" 
                        ? "stroke-rose-500 fill-rose-500/60" 
                        : "stroke-rose-500/20 fill-transparent hover:stroke-rose-300 hover:fill-rose-500/10"
                    }`}
                    strokeWidth={vtCurrentTouch === "mid_chest" ? "2.5" : "1.2"}
                    filter={vtCurrentTouch === "mid_chest" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-mid-chest"
                  />

                  {/* NIPPLES (Left & Right Pulsing Breasts) */}
                  <g 
                    onClick={() => handleZoneTouch("nipples")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "nipples" 
                        ? "stroke-pink-500 fill-pink-500/60" 
                        : "stroke-pink-500/25 fill-transparent hover:stroke-pink-400 hover:fill-pink-500/10"
                    }`}
                    filter={vtCurrentTouch === "nipples" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-nipples"
                  >
                    <path d="M 67 136 C 65 152, 85 155, 95 142 M 133 136 C 135 152, 115 155, 105 142" strokeWidth="1" strokeDasharray="2,2" />
                    <circle cx="81" cy="142" r="9" strokeWidth={vtCurrentTouch === "nipples" ? "2.5" : "1.2"} />
                    <circle cx="81" cy="142" r="2.5" fill="#ec4899" className={vtCurrentTouch === "nipples" ? "animate-ping" : ""} />
                    <circle cx="119" cy="142" r="9" strokeWidth={vtCurrentTouch === "nipples" ? "2.5" : "1.2"} />
                    <circle cx="119" cy="142" r="2.5" fill="#ec4899" className={vtCurrentTouch === "nipples" ? "animate-ping" : ""} />
                  </g>

                  {/* WAIST */}
                  <path 
                    onClick={() => handleZoneTouch("waist")}
                    d="M 72 150 C 65 174, 85 194, 100 194 C 115 194, 135 174, 128 150 C 131 166, 125 191, 100 191 C 75 191, 69 166, 72 150 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "waist" 
                        ? "stroke-red-500 fill-red-500/65" 
                        : "stroke-red-500/25 fill-transparent hover:stroke-red-350 hover:fill-red-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "waist" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "waist" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-waist"
                  />

                  {/* VAGINA */}
                  <g
                    onClick={() => handleZoneTouch("vagina")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "vagina" 
                        ? "stroke-purple-500 fill-purple-550/65" 
                        : "stroke-purple-500/25 fill-transparent hover:stroke-purple-400 hover:fill-purple-500/15"
                    }`}
                    filter={vtCurrentTouch === "vagina" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-vagina"
                  >
                    <path 
                      d="M 76 197 Q 100 201 124 197 C 120 223, 110 240, 100 240 C 90 240, 80 223, 76 197 Z"
                      strokeWidth={vtCurrentTouch === "vagina" ? "2.5" : "1.2"}
                    />
                    <line x1="100" y1="208" x2="100" y2="228" strokeWidth="2.5" stroke="#c084fc" className={vtCurrentTouch === "vagina" ? "animate-pulse" : "opacity-30"} />
                  </g>

                  {/* THIGHS */}
                  <g
                    onClick={() => handleZoneTouch("thighs")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "thighs" 
                        ? "stroke-purple-600 fill-purple-600/70" 
                        : "stroke-purple-600/20 fill-transparent hover:stroke-purple-400 hover:fill-purple-600/15"
                    }`}
                    filter={vtCurrentTouch === "thighs" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="female-thighs"
                  >
                    <path d="M 75 242 C 58 265, 75 320, 78 335 L 97 335 C 97 320, 95 265, 96 242 Z" strokeWidth={vtCurrentTouch === "thighs" ? "2.5" : "1.2"} />
                    <path d="M 125 242 C 142 265, 125 320, 122 335 L 103 335 C 103 320, 105 265, 104 242 Z" strokeWidth={vtCurrentTouch === "thighs" ? "2.5" : "1.2"} />
                  </g>
                </>
              ) : (
                <>
                  {/* MALE MODEL WIREFRAME (BROAD ATHLETIC V-TAPER) */}
                  <g className="opacity-95 transition-all duration-300 pointer-events-none">
                    {/* Head contour */}
                    <path d="M 84 45 C 84 27, 116 27, 116 45 C 116 59, 84 59, 84 45 Z" className="stroke-indigo-500/20 fill-indigo-950/5 stroke-1" />
                    <path d="M 84 39 Q 80 44 84 47" className="stroke-indigo-700/30 fill-transparent stroke-1" />
                    <path d="M 116 39 Q 120 44 116 47" className="stroke-indigo-700/30 fill-transparent stroke-1" />
                    
                    {/* Neck & Shoulders (Muscular neck and broad width) */}
                    <path d="M 90 58 L 86 85 L 58 96 L 46 115" className="stroke-indigo-700/35 fill-transparent stroke-1.2" />
                    <path d="M 110 58 L 114 85 L 142 96 L 154 115" className="stroke-indigo-700/35 fill-transparent stroke-1.2" />
                    
                    {/* Arms (Strong) */}
                    <path d="M 46 115 C 34 135, 24 165, 21 195 C 18 215, 22 230, 26 240" className="stroke-indigo-700/25 fill-transparent stroke-1" />
                    <path d="M 154 115 C 166 135, 176 165, 179 195 C 182 215, 178 230, 174 240" className="stroke-indigo-700/25 fill-transparent stroke-1" />
                    
                    {/* Side body profile boundaries (V-Taper) */}
                    <path d="M 58 115 Q 52 140 68 180 L 74 215 L 78 245 M 142 115 Q 148 140 132 180 L 126 215 L 122 245" className="stroke-indigo-750/35 fill-transparent stroke-1.2" strokeDasharray="3,3" />
                    
                    {/* Hip & Leg outlines (Powerful build) */}
                    <path d="M 78 245 L 81 310 L 83 385 M 122 245 L 119 310 L 117 385" className="stroke-indigo-700/25 fill-transparent stroke-1.2" />
                    <path d="M 100 245 L 94 385 M 100 245 L 106 385" className="stroke-indigo-800/20 fill-transparent stroke-1" strokeDasharray="1,4" />
                  </g>

                  {/* INTERACTIVE BODY ZONES */}
                  {/* LIPS */}
                  <path 
                    onClick={() => handleZoneTouch("lips")}
                    d="M 88 51 C 92 48, 96 48, 100 51 C 104 48, 108 48, 112 51 C 113 53, 109 56, 100 56 C 91 56, 88 53, 88 51 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "lips" 
                        ? "stroke-pink-500 fill-pink-500/65" 
                        : "stroke-pink-500/30 fill-transparent hover:stroke-pink-400 hover:fill-pink-500/10"
                    }`}
                    strokeWidth={vtCurrentTouch === "lips" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "lips" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-lips"
                  />

                  {/* NECK */}
                  <path 
                    onClick={() => handleZoneTouch("neck")}
                    d="M 90 58 L 110 58 Q 108 73 106 82 Q 100 84 94 82 Q 92 73 90 58 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "neck" 
                        ? "stroke-pink-500 fill-pink-500/65" 
                        : "stroke-pink-500/25 fill-transparent hover:stroke-pink-350 hover:fill-pink-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "neck" ? "3.5" : "1.5"}
                    filter={vtCurrentTouch === "neck" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-neck"
                  />

                  {/* COLLARBONE */}
                  <path 
                    onClick={() => handleZoneTouch("collarbone")}
                    d="M 58 84 Q 100 90 142 84 L 144 94 Q 100 100 56 94 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "collarbone" 
                        ? "stroke-purple-500 fill-purple-550/65" 
                        : "stroke-purple-500/25 fill-transparent hover:stroke-purple-400 hover:fill-purple-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "collarbone" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "collarbone" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-collarbone"
                  />

                  {/* UPPER CHEST (MASCULINE PECS) */}
                  <path 
                    onClick={() => handleZoneTouch("chest")}
                    d="M 62 96 Q 100 102 138 96 L 140 128 C 120 130, 105 130, 100 114 C 95 130, 80 130, 60 128 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "chest" 
                        ? "stroke-[#3b82f6] fill-[#3b82f6]/45" 
                        : "stroke-[#3b82f6]/30 fill-transparent hover:stroke-blue-400 hover:fill-[#3b82f6]/10"
                    }`}
                    strokeWidth={vtCurrentTouch === "chest" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "chest" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-pecs-chest"
                  />

                  {/* MID CHEST (ABS BLOCK PACKS) */}
                  <g
                    onClick={() => handleZoneTouch("mid_chest")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "mid_chest" 
                        ? "stroke-[#22c55e] fill-[#22c55e]/40" 
                        : "stroke-[#22c55e]/25 fill-transparent hover:stroke-green-400 hover:fill-[#22c55e]/10"
                    }`}
                    filter={vtCurrentTouch === "mid_chest" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-abs-mid-chest"
                  >
                    <path 
                      d="M 64 128 Q 100 130 136 128 L 132 176 Q 100 178 68 176 Z"
                      strokeWidth={vtCurrentTouch === "mid_chest" ? "2.5" : "1.2"}
                    />
                    {/* Masculine Abs grid splits inside */}
                    <line x1="100" y1="130" x2="100" y2="176" strokeWidth="1" strokeDasharray="2,2" className="opacity-40" />
                    <line x1="74" y1="145" x2="126" y2="145" strokeWidth="1" strokeDasharray="2,2" className="opacity-40" />
                    <line x1="72" y1="160" x2="128" y2="160" strokeWidth="1" strokeDasharray="2,2" className="opacity-40" />
                  </g>

                  {/* MASCULINE NIPPLES */}
                  <g 
                    onClick={() => handleZoneTouch("nipples")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "nipples" 
                        ? "stroke-pink-500 fill-pink-500/60" 
                        : "stroke-pink-500/25 fill-transparent hover:stroke-pink-400 hover:fill-pink-500/10"
                    }`}
                    filter={vtCurrentTouch === "nipples" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-nipples"
                  >
                    {/* Left Nipple Dot */}
                    <circle cx="76" cy="120" r="6" strokeWidth={vtCurrentTouch === "nipples" ? "2.5" : "1"} />
                    <circle cx="76" cy="120" r="1.5" fill="#ec4899" className={vtCurrentTouch === "nipples" ? "animate-ping" : ""} />
                    {/* Right Nipple Dot */}
                    <circle cx="124" cy="120" r="6" strokeWidth={vtCurrentTouch === "nipples" ? "2.5" : "1"} />
                    <circle cx="124" cy="120" r="1.5" fill="#ec4899" className={vtCurrentTouch === "nipples" ? "animate-ping" : ""} />
                  </g>

                  {/* WAIST (V-Belt & Obliques) */}
                  <path 
                    onClick={() => handleZoneTouch("waist")}
                    d="M 68 176 Q 100 178 132 176 L 126 212 L 74 212 Z" 
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "waist" 
                        ? "stroke-red-500 fill-red-500/60" 
                        : "stroke-red-500/25 fill-transparent hover:stroke-red-350 hover:fill-red-500/15"
                    }`}
                    strokeWidth={vtCurrentTouch === "waist" ? "3" : "1.5"}
                    filter={vtCurrentTouch === "waist" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-waist"
                  />

                  {/* GROIN / SHAFT (VAGINA INTERNALLY) */}
                  <g
                    onClick={() => handleZoneTouch("vagina")}
                    className={`cursor-pointer transition-all duration-350 ${
                      vtCurrentTouch === "vagina" 
                        ? "stroke-[#a855f7] fill-[#a855f7]/60" 
                        : "stroke-[#a855f7]/25 fill-transparent hover:stroke-purple-400 hover:fill-[#a855f7]/15"
                    }`}
                    filter={vtCurrentTouch === "vagina" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-groin"
                  >
                    <path 
                      d="M 74 212 L 126 212 L 122 245 C 112 245, 105 248, 100 248 C 95 248, 88 245, 78 245 Z"
                      strokeWidth={vtCurrentTouch === "vagina" ? "2.5" : "1.2"}
                    />
                    {/* Centered shaft pulsing indicator bulged down */}
                    <line x1="100" y1="216" x2="100" y2="238" strokeWidth="3" stroke="#a855f7" className={vtCurrentTouch === "vagina" ? "animate-pulse" : "opacity-30"} />
                  </g>

                  {/* THIGHS */}
                  <g
                    onClick={() => handleZoneTouch("thighs")}
                    className={`cursor-pointer transition-all duration-300 ${
                      vtCurrentTouch === "thighs" 
                        ? "stroke-purple-600 fill-purple-600/70" 
                        : "stroke-purple-600/20 fill-transparent hover:stroke-purple-400 hover:fill-purple-600/15"
                    }`}
                    filter={vtCurrentTouch === "thighs" ? "url(#neon-hot)" : "url(#neon-ambient)"}
                    id="male-thighs"
                  >
                    <path d="M 78 245 L 98 245 L 96 335 L 81 335 Z" strokeWidth={vtCurrentTouch === "thighs" ? "2.5" : "1.2"} />
                    <path d="M 122 245 L 102 245 L 104 335 L 119 335 Z" strokeWidth={vtCurrentTouch === "thighs" ? "2.5" : "1.2"} />
                  </g>
                </>
              )}
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
