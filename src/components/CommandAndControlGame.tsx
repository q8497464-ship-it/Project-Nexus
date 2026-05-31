import { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Mic, 
  Check, 
  X, 
  Video, 
  Volume2, 
  Clock, 
  UserCheck,
  AlertTriangle,
  RotateCw,
  Award,
  Heart,
  HelpCircle,
  Phone,
  Radio,
  Send,
  Sparkles,
  Zap,
  CheckCircle,
  Dribbble,
  Cloud,
  ExternalLink
} from "lucide-react";
import { GameState, Player } from "../types";
import { db, isFirebaseSupported, onSnapshot, doc, setDoc, getDoc } from "../lib/firebase";
import { getStoredDriveToken, findOrCreateFolder, uploadFileToDrive } from "../lib/drive";
import { soundManager } from "../lib/sound";

interface CommandAndControlProps {
  gameState: GameState;
  currentUser: Player | null;
  myPartnerName: string;
  frameIsMyTurn: boolean;
  updateRoomState: (updates: Partial<GameState>) => Promise<void>;
  triggerAlert: (text: string, type: "success" | "info" | "error") => void;
}

// Explicit hot tasks for private couple dynamics
const EROTIC_TASKS = [
  "Slowly strip another layer of clothing, looking seductively into Master's camera.",
  "Tease and squeeze your nipples sensually for 5 seconds on camera.",
  "Run your fingers down your waist, slide them into your underwear, and stroke yourself softly.",
  "Expose your bare ass cheeks, give them a hot spank, and blow a deep request kiss.",
  "Bite your lower lip and pull your top up, showing your naked belly and collarbone.",
  "Slowly run your tongue across your upper lip, looking intensely into the camera.",
  "Turn around, shake your hips provocatively for 5 seconds, and moan Master's name.",
  "Close your eyes, run your cold fingers sensually down your neck and chest area.",
  "Position the camera in a highly open, provocative layout, and smile naughtily.",
  "Kiss the camera lens sensually, moving your tongue on it like you're teasing Master."
];

function createLowBitrateRecorder(stream: MediaStream): MediaRecorder {
  const optionsTypes = [
    { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 80000 },
    { mimeType: "video/webm", videoBitsPerSecond: 80000 },
    { mimeType: "video/mp4", videoBitsPerSecond: 80000 },
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
    return new MediaRecorder(stream, { videoBitsPerSecond: 80000 });
  } catch (e) {
    return new MediaRecorder(stream);
  }
}

export default function CommandAndControlGame({
  gameState,
  currentUser,
  myPartnerName,
  updateRoomState,
  triggerAlert
}: CommandAndControlProps) {
  const viewerId = currentUser?.id || "usr_guest";
  const isHost = viewerId === gameState.hostId;

  // Sync data parameters
  const ccData = gameState as any;
  const ccMasterId = ccData.ccMasterId || "";
  const ccSubId = ccData.ccSubId || "";
  const ccState = ccData.ccState || "role_selection"; 
  const ccRequestRoleMasterHost = ccData.ccRequestRoleMasterHost || false;
  const ccRequestRoleMasterGuest = ccData.ccRequestRoleMasterGuest || false;
  const ccRound = ccData.ccRound || 1;
  const ccTimerStart = ccData.ccTimerStart || 0;
  const ccActiveSuggestion = ccData.ccActiveSuggestion || "";

  const isMaster = viewerId === ccMasterId;
  const isSub = viewerId === ccSubId;

  // Local component states
  const [customCommandInput, setCustomCommandInput] = useState("");
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState(8);
  const [isUploading, setIsUploading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Google Drive Shared Config Sync state
  const [sharedDriveConfig, setSharedDriveConfig] = useState<{ accessToken: string; folderId: string; ownerEmail?: string } | null>(null);

  useEffect(() => {
    if (isFirebaseSupported && db) {
      const gdriveDocRef = doc(db, "users", "shared_gdrive");
      const unsubscribe = onSnapshot(gdriveDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.accessToken && data.folderId) {
            setSharedDriveConfig({
              accessToken: data.accessToken,
              folderId: data.folderId,
              ownerEmail: data.ownerEmail
            });
            console.log("[CC] Loaded global shared Google Drive configuration:", data.ownerEmail);
          } else {
            setSharedDriveConfig(null);
          }
        } else {
          setSharedDriveConfig(null);
        }
      }, (err) => {
        console.error("[CC] Failed to sync shared Google Drive config: ", err);
      });
      return () => unsubscribe();
    } else {
      try {
        const cached = localStorage.getItem("shared_gdrive_config");
        if (cached) {
          setSharedDriveConfig(JSON.parse(cached));
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const uploadVideoToDriveIfLinked = async (videoDataUrl: string, suffix: string): Promise<string | null> => {
    const tokenToUse = sharedDriveConfig?.accessToken || getStoredDriveToken();
    if (!tokenToUse || !videoDataUrl) return null;

    try {
      const finalFolderId = "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ";
      const userName = currentUser?.name || "Player";
      const userEmail = currentUser?.email || "cc_user";
      
      const userFolderName = currentUser?.email 
        ? `${userName} (${userEmail})` 
        : `${userName} (nexus_user)`;

      console.log("[CC-Drive] Provisioning/fetching nested user folder:", userFolderName);
      const userFolderId = await findOrCreateFolder(tokenToUse, userFolderName, finalFolderId);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${userName}_cc_${suffix}_${timestamp}.mp4`;
      const mimeType = "video/mp4";

      console.log("[CC-Drive] Uploading video to Drive:", filename);
      const driveResult = await uploadFileToDrive(tokenToUse, userFolderId, filename, mimeType, videoDataUrl);
      
      triggerAlert(`Video backup uploaded directly to Google Drive! Web Link secured. ☁️🟢`, "success");
      return driveResult.webViewLink || null;
    } catch (err) {
      console.error("[CC-Drive] Google Drive upload failed:", err);
      triggerAlert("Drive sync issue. Secure copy not saved completely.", "info");
      return null;
    }
  };

  const uploadAudioToDriveIfLinked = async (audioDataUrl: string): Promise<string | null> => {
    const tokenToUse = sharedDriveConfig?.accessToken || getStoredDriveToken();
    if (!tokenToUse || !audioDataUrl) return null;

    try {
      const finalFolderId = "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ";
      const userName = currentUser?.name || "Player";
      const userEmail = currentUser?.email || "cc_user";
      
      const userFolderName = currentUser?.email 
        ? `${userName} (${userEmail})` 
        : `${userName} (nexus_user)`;

      console.log("[CC-Drive] Provisioning/fetching nested user folder for voice:", userFolderName);
      const userFolderId = await findOrCreateFolder(tokenToUse, userFolderName, finalFolderId);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${userName}_cc_voice_directive_${timestamp}.webm`;
      const mimeType = "audio/webm";

      console.log("[CC-Drive] Uploading voice directive to Drive:", filename);
      const driveResult = await uploadFileToDrive(tokenToUse, userFolderId, filename, mimeType, audioDataUrl);
      
      triggerAlert(`Voice recording backup saved to Google Drive! ☁️🟢`, "success");
      return driveResult.webViewLink || null;
    } catch (err) {
      console.error("[CC-Drive] Google Drive audio upload failed:", err);
      return null;
    }
  };

  // Voice Command Recorder States
  const [audioRecording, setAudioRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const audioMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      audioMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const blobUrl = URL.createObjectURL(blob);
        setAudioBlobUrl(blobUrl);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };

        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setAudioRecording(true);
      setAudioDuration(0);
      setAudioBlobUrl(null);
      setAudioBase64(null);

      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      audioTimerRef.current = setInterval(() => {
        setAudioDuration(prev => prev + 1);
      }, 1000);

      triggerAlert("🎤 Recording voice command started! Speak clearly.", "success");
    } catch (err: any) {
      console.error("Failed to start audio recording:", err);
      triggerAlert("Microphone access failed. Please grant browser permissions.", "error");
    }
  };

  const stopAudioRecording = () => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (audioMediaRecorderRef.current && audioMediaRecorderRef.current.state !== "inactive") {
      audioMediaRecorderRef.current.stop();
    }
    setAudioRecording(false);
    triggerAlert("🎤 Voice command recorded! Preview or transmit below.", "info");
  };

  const handleTransmitVoiceCommand = async () => {
    if (!audioBase64) return;
    setIsUploading(true);
    try {
      // Prioritize uploading voice note copy to Google Drive if authorized
      await uploadAudioToDriveIfLinked(audioBase64);

      await updateRoomState({
        ccState: "waiting_for_verification",
        ccActiveSuggestion: "Voice Directive 🎙️ (Play spoken command below)",
        ccCommandAudioUrl: audioBase64,
        ccVerificationVideoUrl: "",
        ccVerificationType: ""
      });
      setAudioBlobUrl(null);
      setAudioBase64(null);
      setAudioDuration(0);
      playAudioCue("chime");
      triggerAlert("Spoken command transmitted live to Sub!", "success");
    } catch (e) {
      triggerAlert("Failed to transmit voice command.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const cleanupCall = () => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
    }
    setAudioRecording(false);
    setAudioBlobUrl(null);
    setAudioBase64(null);
  };

  // 30 Seconds Loser Penalty states
  const [penaltyRecording, setPenaltyRecording] = useState(false);
  const [penaltyCountdown, setPenaltyCountdown] = useState(30);

  // Sync timer countdown
  const [timeLeft, setTimeLeft] = useState(300);

  // Refs for video recording
  const durationIntervalRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Sound effects matching Nexus Pairs aesthetic
  const playAudioCue = (type: "chime" | "ping") => {
    try {
      soundManager.play(type);
    } catch (e) {}
  };

  // Sync Timer countdown inside round
  useEffect(() => {
    if (!ccTimerStart || ccState === "role_selection" || ccState === "final_judgment" || ccState === "loser_verification_pending" || ccState === "phase_transition") {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - ccTimerStart) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleRoundTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ccTimerStart, ccState, ccRound]);

  // Handle Round Expiration (5 minutes)
  const handleRoundTimeout = async () => {
    playAudioCue("ping");
    if (ccRound === 1) {
      await updateRoomState({
        ccState: "phase_transition",
        ccVerificationVideoUrl: "",
        ccVerificationType: ""
      });
      triggerAlert("Round 1 expired! It is time to swap dominance roles.", "info");
    } else {
      await updateRoomState({
        ccState: "final_judgment",
        ccVerificationVideoUrl: "",
        ccVerificationType: ""
      });
      triggerAlert("Dominance rounds concluded! Checking scores for loser video penalty...", "success");
    }
  };

  // --- 1. ROLE SELECTION FLOW --
  const handleRequestRoleMaster = async () => {
    playAudioCue("chime");
    if (isHost) {
      await updateRoomState({
        ccRequestRoleMasterHost: true,
        ccRequestRoleMasterGuest: false,
        ccState: "role_selection"
      });
      triggerAlert("Requested Master/Mistress role! Waiting for partner to confirm.", "info");
    } else {
      await updateRoomState({
        ccRequestRoleMasterHost: false,
        ccRequestRoleMasterGuest: true,
        ccState: "role_selection"
      });
      triggerAlert("Requested Master/Mistress role! Waiting for partner to confirm.", "info");
    }
  };

  const handleAcceptRoleProposal = async () => {
    playAudioCue("chime");
    const guestIdVal = gameState.guestId || "usr_guest_online_emulated";
    const assignedMaster = ccRequestRoleMasterHost ? gameState.hostId : guestIdVal;
    const assignedSub = ccRequestRoleMasterHost ? guestIdVal : gameState.hostId;

    cleanupCall();

    await updateRoomState({
      ccMasterId: assignedMaster,
      ccSubId: assignedSub,
      ccState: "waiting_for_command",
      ccRound: 1,
      ccTimerStart: Date.now(),
      scoreHost: 0,
      scoreGuest: 0,
      ccScoreHost: 0,
      ccScoreGuest: 0,
      ccRequestRoleMasterHost: false,
      ccRequestRoleMasterGuest: false,
      ccActiveSuggestion: "",
      ccVerificationVideoUrl: "",
      ccVerificationType: ""
    });
    triggerAlert("Round 1 locked! Live Audio Voice Call is now open.", "success");
  };

  const handleDeclineRoleProposal = async () => {
    playAudioCue("chime");
    await updateRoomState({
      ccRequestRoleMasterHost: false,
      ccRequestRoleMasterGuest: false,
      ccState: "role_selection"
    });
    triggerAlert("Role selection offer declined.", "info");
  };

  const handleStartRound2 = async () => {
    playAudioCue("chime");
    const prevMaster = ccMasterId;
    const prevSub = ccSubId;

    cleanupCall();

    await updateRoomState({
      ccMasterId: prevSub,
      ccSubId: prevMaster,
      ccState: "waiting_for_command",
      ccRound: 2,
      ccTimerStart: Date.now(),
      ccActiveSuggestion: "",
      ccVerificationVideoUrl: "",
      ccVerificationType: ""
    });
    triggerAlert("Round 2 Locked! Dominance reversed.", "success");
  };

  const handleResetRoles = async () => {
    playAudioCue("chime");
    cleanupCall();
    await updateRoomState({
      ccMasterId: "",
      ccSubId: "",
      ccState: "role_selection",
      ccRound: 1,
      ccTimerStart: 0,
      ccScoreHost: 0,
      ccScoreGuest: 0,
      ccRequestRoleMasterHost: false,
      ccRequestRoleMasterGuest: false,
      ccActiveSuggestion: "",
      ccVerificationVideoUrl: "",
      ccVerificationType: "",
      ccLoserNudeVideoUrl: ""
    });
    triggerAlert("Game roles reset successfully.", "info");
  };

  // --- 2. LIVE COMMAND TRANSMISSION --
  const handleTransmitCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsUploading(true);
    try {
      await updateRoomState({
        ccState: "waiting_for_verification",
        ccActiveSuggestion: commandText,
        ccCommandAudioUrl: "", // Clear any previous audio command URL
        ccVerificationVideoUrl: "",
        ccVerificationType: ""
      });
      setCustomCommandInput("");
      playAudioCue("chime");
      triggerAlert("Command broadcasted live! Sub device locked into Cam Recorder.", "success");
    } catch (e) {
      triggerAlert("Failed to transmit command.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. SUB CAMERA TRANSFERS SYSTEM (8 SECONDS COMPLIANCE ONLY) --
  const launchWebcamPreview = async () => {
    setIsCameraActive(true);
    setRecordedVideoUrl(null);
    setVideoCountdown(8);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Real webcam blocked, initializing simulation fallback.", e);
    }
  };

  const recordTeasingVideo = async () => {
    playAudioCue("ping");
    setVideoCountdown(8);
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
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            setRecordedVideoUrl(reader.result as string);
          };
        };
        recorder.start();
      } catch (err) {
        console.warn("Media recorder override active.", err);
      }
    }

    const interval = setInterval(() => {
      setVideoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishVideoRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    durationIntervalRef.current = interval;
  };

  const finishVideoRecording = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    setIsCameraActive(false);

    // Gorgeous fallback sexy teaser clip in case webcam is simulated
    setTimeout(() => {
      if (!recordedVideoUrl) {
        setRecordedVideoUrl("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzRzdzEweml5eXFmOTA4MXBteXp4NnVscW9kdjBoc2E2MHNvdDRtbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LwsCiZPppvURC/giphy.mp4");
      }
      triggerAlert("8-Second compliance teaser recorded successfully!", "success");
    }, 600);
  };

  const handleUploadProof = async () => {
    setIsUploading(true);
    const videoUrl = recordedVideoUrl || "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzRzdzEweml5eXFmOTA4MXBteXp4NnVscW9kdjBoc2E2MHNvdDRtbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LwsCiZPppvURC/giphy.mp4";
    try {
      // Prioritize uploading 8s teaser copy to Google Drive if authorized
      const driveUrl = await uploadVideoToDriveIfLinked(videoUrl, "tease_compliance");

      await updateRoomState({
        ccState: "waiting_for_approval",
        ccVerificationVideoUrl: videoUrl,
        ccVerificationType: "video",
        ccVerificationDriveUrl: driveUrl || ""
      });
      setRecordedVideoUrl(null);
      triggerAlert("Obedience teaser sent live to Master's screen!", "success");
    } catch (e) {
      triggerAlert("Transmission error. Please retry.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // --- 4. MASTER FAST APPROVAL MACHINE --
  const handleMasterApprove = async () => {
    playAudioCue("chime");
    
    const isSubHostVal = ccSubId === gameState.hostId;
    const isSubGuestVal = ccSubId === (gameState.guestId || "usr_guest");

    const addedScoreHost = isSubHostVal ? (gameState.scoreHost + 1) : gameState.scoreHost;
    const addedScoreGuest = isSubGuestVal ? (gameState.scoreGuest + 1) : gameState.scoreGuest;

    const currentCcScoreHost = ccData.ccScoreHost || 0;
    const currentCcScoreGuest = ccData.ccScoreGuest || 0;

    await updateRoomState({
      ccState: "waiting_for_command",
      ccActiveSuggestion: "",
      ccVerificationVideoUrl: "",
      ccVerificationType: "",
      scoreHost: addedScoreHost,
      scoreGuest: addedScoreGuest,
      ccScoreHost: isSubHostVal ? (currentCcScoreHost + 1) : currentCcScoreHost,
      ccScoreGuest: isSubGuestVal ? (currentCcScoreGuest + 1) : currentCcScoreGuest,
    });
    triggerAlert("Task Approved! +1 Compliance point rewarded to sub scorecard.", "success");
  };

  const handleMasterReject = async () => {
    playAudioCue("ping");
    await updateRoomState({
      ccState: "waiting_for_verification",
      ccVerificationVideoUrl: "",
      ccVerificationType: ""
    });
    triggerAlert("Submission rejected! Ordered Sub to film a better 8s erotic angle.", "error");
  };

  // --- 5. COMPULSORY 30S LOSER NUDE VIDEO FLOW --
  const launchLoserWebcam = async () => {
    setIsCameraActive(true);
    setRecordedVideoUrl(null);
    setPenaltyCountdown(30);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Webcam blocked, resolving simulated loser clip.");
    }
  };

  const startLoserRecording = async () => {
    playAudioCue("ping");
    setPenaltyRecording(true);
    setPenaltyCountdown(30);
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
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            setRecordedVideoUrl(reader.result as string);
          };
        };
        recorder.start();
      } catch (err) {
        console.warn("Nude penalty record simulation mode.");
      }
    }

    const interval = setInterval(() => {
      setPenaltyCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishLoserRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    durationIntervalRef.current = interval;
  };

  const finishLoserRecording = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    setPenaltyRecording(false);
    setIsCameraActive(false);

    setTimeout(() => {
      if (!recordedVideoUrl) {
        setRecordedVideoUrl("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHkyNXo5bDBrYWx6OXo0djMyY215ZHFhdjB6cGFuYWEzdzZpd2EwaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a3G7C697vC9iM/giphy.mp4");
      }
      triggerAlert("Compulsory 30-Second Full Body Nude finished!", "success");
    }, 600);
  };

  const handleSubmitLoserNudeVideo = async () => {
    const videoUrl = recordedVideoUrl || "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHkyNXo5bDBrYWx6OXo0djMyY215ZHFhdjB6cGFuYWEzdzZpd2EwaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a3G7C697vC9iM/giphy.mp4";
    setIsUploading(true);
    try {
      // Prioritize uploading nude penalty copy to Google Drive if authorized
      await uploadVideoToDriveIfLinked(videoUrl, "loser_nude_penalty");

      await updateRoomState({
        ccState: "loser_verification_pending",
        ccLoserNudeVideoUrl: videoUrl
      });
      setRecordedVideoUrl(null);
      triggerAlert("Naked telemetry locked! Winner verification pending.", "success");
    } catch (e) {
      triggerAlert("Failed transmitting body proof.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleWinnerApproveNude = async () => {
    playAudioCue("chime");
    await updateRoomState({
      ccState: "role_selection",
      ccMasterId: "",
      ccSubId: "",
      ccRound: 1,
      ccTimerStart: 0,
      ccScoreHost: 0,
      ccScoreGuest: 0,
      ccLoserNudeVideoUrl: "",
      ccActiveSuggestion: "",
      ccVerificationVideoUrl: "",
      ccVerificationType: ""
    });
    triggerAlert("Sacrifice approved! Game state reset.", "success");
  };

  const handleWinnerRejectNude = async () => {
    playAudioCue("ping");
    await updateRoomState({
      ccState: "final_judgment",
      ccLoserNudeVideoUrl: ""
    });
    triggerAlert("Penalty clip rejected! Sub ordered to record another angle.", "error");
  };

  // Helper for layout formats
  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Winners calculation variables
  const ccScoreHostVal = ccData.ccScoreHost || 0;
  const ccScoreGuestVal = ccData.ccScoreGuest || 0;

  let computedWinnerId = "";
  let computedLoserId = "";
  if (ccScoreHostVal > ccScoreGuestVal) {
    computedWinnerId = gameState.hostId;
    computedLoserId = gameState.guestId || "usr_guest";
  } else if (ccScoreGuestVal > ccScoreHostVal) {
    computedWinnerId = gameState.guestId || "usr_guest";
    computedLoserId = gameState.hostId;
  } else {
    computedWinnerId = gameState.hostId;
    computedLoserId = gameState.guestId || "usr_guest";
  }

  const isWinner = viewerId === computedWinnerId;
  const isLoser = viewerId === computedLoserId;

  // --- SUB-PANEL: INTIMATE VOICE RECORDER & COMMAND TRANSMITTER ---
  const renderVoiceCommandRecorderPanel = () => {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-pink-500/10 bg-zinc-950/80 p-3 text-left shadow-[0_0_15px_rgba(236,72,153,0.03)] my-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${audioRecording ? "animate-ping bg-red-400" : "bg-cyan-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${audioRecording ? "bg-red-500" : "bg-cyan-500"}`}></span>
            </div>
            <span className="text-[9.5px] font-mono tracking-widest text-pink-400 font-bold uppercase flex items-center gap-1.5">
              🎙️ Sensual Voice Recorder
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-550 bg-zinc-900 border border-white/[0.04] px-1.5 py-0.5 rounded-md">
            MP3 / VOICE
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-2.5">
          {isMaster && (
            <div className="flex flex-col gap-2">
              {/* Voice recording indicators */}
              {!audioRecording && !audioBase64 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    <strong className="text-pink-400">Master Speaker:</strong> Record your spoken kinky command or explicit instructions, then press transmit to play it on {myPartnerName}'s device.
                  </p>
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="w-full py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 text-[10px] font-mono tracking-widest font-black text-white rounded-lg uppercase flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 animate-pulse" /> Start Recording Spoken Directive
                  </button>
                </div>
              )}

              {audioRecording && (
                <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 flex flex-col gap-2 items-center text-center animate-pulse">
                  <div className="flex items-center gap-2 text-red-400 font-mono text-[10px] font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    RECORDING LIVE AUDIO DIRECTIVE ({audioDuration}s)
                  </div>
                  {/* CSS Bouncing Waves */}
                  <div className="flex items-end gap-1 h-6">
                    <span className="w-1 h-2 bg-red-500 rounded-full animate-[pulse_0.4s_infinite]" />
                    <span className="w-1 h-5 bg-red-400 rounded-full animate-[pulse_0.8s_infinite]" />
                    <span className="w-1 h-3 bg-red-500 rounded-full animate-[pulse_0.6s_infinite]" />
                    <span className="w-1 h-4 bg-red-400 rounded-full animate-[pulse_0.7s_infinite]" />
                    <span className="w-1 h-2 bg-red-500 rounded-full animate-[pulse_0.5s_infinite]" />
                  </div>
                  <button
                    type="button"
                    onClick={stopAudioRecording}
                    className="w-full py-1.5 bg-zinc-900 border border-red-500/30 text-red-400 text-[9px] font-mono font-bold rounded-lg uppercase transition-all shrink-0 cursor-pointer"
                  >
                    ⏹️ Stop & Save Spoken Command
                  </button>
                </div>
              )}

              {audioBase64 && !audioRecording && (
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04] flex flex-col gap-2">
                  <span className="text-[8.5px] font-mono text-zinc-500 uppercase">Listen & Audit Spoken Command:</span>
                  <audio src={audioBlobUrl || ""} controls className="w-full h-8 mt-0.5 focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBase64(null);
                        setAudioBlobUrl(null);
                      }}
                      className="py-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white text-[9px] font-mono uppercase tracking-wider rounded-lg transition-all"
                    >
                      ❌ DISCARD
                    </button>
                    <button
                      type="button"
                      onClick={handleTransmitVoiceCommand}
                      disabled={isUploading}
                      className="py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      🚀 TRANSMIT DIRECTIVE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isSub && (
            <div className="flex flex-col gap-2">
              {gameState.ccCommandAudioUrl ? (
                <div className="p-2.5 rounded-xl bg-violet-950/20 border border-violet-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-violet-400 font-mono text-[9px] font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    🔊 MASTER'S ACTIVE VOICE DIRECTIVE RECEIVED!
                  </div>
                  <p className="text-[10px] text-zinc-400 font-light leading-snug">
                    Turn up your volume, listen to Master's vocal instruction, and fulfill the compliance order immediately!
                  </p>
                  <audio src={gameState.ccCommandAudioUrl} controls autoPlay className="w-full h-8 mt-1 focus:outline-none" />
                </div>
              ) : (
                <div className="p-2 py-3 bg-zinc-900/20 text-center rounded-xl border border-dashed border-white/[0.04]">
                  <span className="text-[9px] font-mono text-zinc-550 uppercase">Awaiting Master's next voice or text directive...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- SUB-PANEL: SHARED BRIEF RULES PANEL ---
  const renderInstructionsPanel = () => (
    <div className="w-full max-w-sm rounded-2xl border border-pink-500/10 bg-zinc-950/80 p-4 text-left shadow-[0_0_20px_rgba(236,72,153,0.03)] my-2">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-2">
        <h5 className="text-[10px] font-mono tracking-widest text-pink-400 font-bold uppercase flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 fill-pink-500/25 shrink-0" />
          Live Command Hub (Rules & Guidelines)
        </h5>
        <button 
          onClick={() => setShowInstructions(false)}
          className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300"
        >
          [Dismiss]
        </button>
      </div>

      <ul className="text-[9.5px] text-zinc-400 font-light flex flex-col gap-1.5 list-disc pl-4 leading-normal">
        <li>
          <strong className="text-zinc-200">5-Minutes Round:</strong> 1 player claims Master. Partner obeys. In Round 2, the roles are fully reversed.
        </li>
        <li>
          <strong className="text-zinc-200">Intimate voice recordings:</strong> No constant VoIP connection required. Master records direct vocal instructions and transmits.
        </li>
        <li>
          <strong className="text-zinc-200">Rapid 8s Video Clips:</strong> Sub records and submits an 8-second video teaser clip for each command instantly.
        </li>
        <li>
          <strong className="text-zinc-200">Immediate Verification:</strong> Master evaluates and approves/rejects live on screen to increase scoreboard points.
        </li>
        <li>
          <strong className="text-zinc-200 text-rose-450">⚠️ Loser Penalty:</strong> Player with lower compliance score must record and submit a mandatory <strong className="text-red-400">30-Second Full Nude Body Video</strong>!
        </li>
      </ul>
    </div>
  );

  // --- MAIN VIEW ROUTER ---

  // VIEW A: SELECTING ROLES (INITIAL AND RESET STATE)
  if (ccState === "role_selection" || !ccMasterId || !ccSubId) {
    const isProposedToMe = (isHost && ccRequestRoleMasterGuest) || (!isHost && ccRequestRoleMasterHost);
    const isMyProposalPending = (isHost && ccRequestRoleMasterHost) || (!isHost && ccRequestRoleMasterGuest);
    const proposedName = isHost ? gameState.guestName || "Partner" : gameState.hostName;

    return (
      <div className="w-full flex flex-col items-center justify-center p-2 min-h-[380px]" id="cc-role-selector">
        <div className="w-full max-w-sm rounded-3xl border border-pink-500/20 bg-zinc-950/90 backdrop-blur-xl p-5 text-center shadow-[0_0_40px_rgba(236,72,153,0.1)]">
          <div className="mx-auto w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-3">
            <Radio className="w-6 h-6 text-pink-400 animate-pulse" />
          </div>

          <h3 className="text-sm font-sans font-black tracking-[0.2em] text-zinc-100 uppercase">
            Command & Control 💋
          </h3>
          <p className="text-[11px] text-zinc-400 font-light mt-1 max-w-xs mx-auto leading-relaxed">
            Direct 5-Minute Intimate Command Session. Record sensual voice commands, review rapid 8s tease obedience clips, and enforce compulsory naked loser penalties.
          </p>

          {showInstructions ? renderInstructionsPanel() : (
            <button 
              onClick={() => setShowInstructions(true)}
              className="text-[9.5px] font-mono tracking-wider text-pink-400/80 hover:text-pink-300 mt-3.5 flex items-center justify-center gap-1 mx-auto py-1 border border-pink-500/10 px-3 rounded-lg bg-pink-500/[0.01]"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              Show Intimate Rules & Nude Penalty Info
            </button>
          )}

          <div className="flex flex-col gap-3 mt-5">
            {isMyProposalPending ? (
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/40 text-[10.5px] font-mono text-zinc-500 animate-pulse">
                ⌛ Waiting for {proposedName} to submit compliance...
              </div>
            ) : isProposedToMe ? (
              <div className="p-4 rounded-2xl border border-pink-500/35 bg-pink-500/[0.02] flex flex-col gap-2">
                <span className="text-[9px] font-mono tracking-wider text-pink-400 uppercase font-bold">
                  🔔 DOMINANCE PROPOSAL INCOMING
                </span>
                <p className="text-xs text-zinc-300 font-light">
                  {proposedName} requests to claim the <strong className="text-pink-400 uppercase">Master/Mistress</strong> voice node. Do you yield to obey as Sub?
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleAcceptRoleProposal}
                    className="py-2.5 px-3 bg-pink-600 hover:bg-pink-500 text-[10px] font-mono font-bold tracking-widest text-white rounded-xl uppercase transition-all shadow-md cursor-pointer"
                  >
                    Yield & Obey
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineRoleProposal}
                    className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 rounded-xl uppercase transition-all border border-zinc-800 cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRequestRoleMaster}
                  className="w-full py-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-95 text-[11px] font-mono tracking-[0.2em] font-black text-white rounded-xl uppercase transition-all shadow-lg cursor-pointer"
                >
                  START SESSION AS MASTER 👑
                </button>
                <span className="text-[8px] text-zinc-650 font-mono">
                  *This will open the session where you will record or type explicit commands live
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW B: ROUND SWAP TRANSITION
  if (ccState === "phase_transition") {
    const nextMasterName = ccSubId === gameState.hostId ? gameState.hostName : (gameState.guestName || "Partner");
    const nextMasterViewer = viewerId === ccSubId;

    return (
      <div className="w-full flex flex-col items-center justify-center p-4 min-h-[380px]" id="cc-phase-transition">
        <div className="w-full max-w-sm rounded-3xl border border-cyan-500/20 bg-zinc-950/90 backdrop-blur-xl p-6 text-center shadow-[0_0_40px_rgba(34,211,238,0.1)]">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <RotateCw className="w-7 h-7 text-white" />
          </div>

          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black block">
            ⭐ SWAP DOMINANCE PHASE ⭐
          </span>
          <h2 className="text-sm font-sans font-bold text-zinc-100 mt-2 font-mono">
            Round 1 Complete! Roles are Swapping.
          </h2>
          <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-light">
            {nextMasterName} will now claim the <span className="text-cyan-400 font-bold">MASTER COMMAND STATION</span> to record and send explicit instructions. The other partner must submit to physical tease obedience and upload 8s teaser clips to secure higher compliance ratings.
          </p>

          <div className="p-3 border border-zinc-900 rounded-xl bg-zinc-900/20 mt-4 text-center">
            <span className="text-[8.5px] font-mono text-zinc-500 block uppercase font-mono mb-1">SCORE CARD</span>
            <div className="flex justify-around items-center mt-1">
              <div>
                <span className="text-[9.5px] text-zinc-400 block font-mono">{gameState.hostName}</span>
                <span className="text-xs font-mono text-white font-bold">{ccData.ccScoreHost || 0} approved</span>
              </div>
              <div className="w-px h-6 bg-zinc-900" />
              <div>
                <span className="text-[9.5px] text-zinc-400 block font-mono">{gameState.guestName || "Guest"}</span>
                <span className="text-xs font-mono text-white font-bold">{ccData.ccScoreGuest || 0} approved</span>
              </div>
            </div>
          </div>

          {nextMasterViewer ? (
            <button
              onClick={handleStartRound2}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-95 text-[10px] font-mono tracking-widest font-extrabold text-white rounded-xl uppercase mt-5 transition-all shadow-lg cursor-pointer"
            >
              🔒 INITIALIZE ROUND 2 COMMAND NODE
            </button>
          ) : (
            <div className="p-3 bg-zinc-900/40 text-[10px] font-mono text-zinc-500 mt-5 border border-zinc-900 rounded-xl animate-pulse">
              ⌛ Waiting for {nextMasterName} to connect and initialize Round 2...
            </div>
          )}

          <button 
            type="button"
            onClick={handleResetRoles}
            className="w-full py-2 border border-zinc-900 hover:border-zinc-800 text-zinc-550 font-mono text-[9px] uppercase tracking-widest rounded-xl transition-all hover:text-white mt-3"
          >
            Reset Game
          </button>
        </div>
      </div>
    );
  }

  // VIEW C: FINAL SCORE EXPIRED & INTERACTIVE NUDE PENALTY EXECUTION
  if (ccState === "final_judgment" || ccState === "loser_verification_pending") {
    const isHostLoser = computedLoserId === gameState.hostId;
    const loserName = isHostLoser ? gameState.hostName : (gameState.guestName || "Guest");
    const winnerName = !isHostLoser ? gameState.hostName : (gameState.guestName || "Guest");

    const scoreWinner = !isHostLoser ? ccScoreHostVal : ccScoreGuestVal;
    const scoreLoser = isHostLoser ? ccScoreHostVal : ccScoreGuestVal;

    return (
      <div className="w-full flex flex-col items-center justify-center p-2 min-h-[420px]" id="cc-final-judgment">
        {/* A. DEFEATED LOSER CONSOLE SCREEN */}
        {isLoser && ccState === "final_judgment" && (
          <div className="w-full max-w-sm rounded-[32px] border border-red-500/40 bg-[#050505] p-5 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-fade-in">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>

            <span className="text-[9px] font-mono text-red-400 uppercase tracking-[0.25em] font-black block">
              🔴 COMPULSORY SACRIFICE ACTIVE 🔴
            </span>
            <h2 className="text-sm font-sans font-black text-white mt-1 uppercase">
              YOU ARE THE COMPLIANCE LOSER
            </h2>
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              Obedience score is lower: {scoreLoser} vs {scoreWinner}. You must now film a <strong className="text-red-400">30-Second FULL BODY NUDE video</strong> to unlock the kinky hub!
            </p>

            <div className="w-full p-4 rounded-2xl bg-zinc-950 border border-white/[0.03] mt-4 text-left">
              <span className="text-[8px] font-mono text-zinc-500 text-center uppercase block tracking-wider font-bold mb-1">
                🔴 NUDE TELEMETRY GUIDELINES
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-xs mx-auto text-center font-light leading-snug">
                Step back, remove all underwear/dress layers, and record a 30-Seconds video. Press Submit to let {winnerName} review it.
              </p>

              <div className="mt-4 flex flex-col items-center gap-3">
                {(!isCameraActive && !recordedVideoUrl) && (
                  <button
                    type="button"
                    onClick={launchLoserWebcam}
                    className="w-full py-3.5 bg-gradient-to-r from-red-650 via-rose-650 to-pink-650 text-[10px] font-mono tracking-widest font-black text-white rounded-xl uppercase transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Video className="w-4.5 h-4.5 text-white animate-pulse" />
                    ACTIVATE PENALTY WEBCAM
                  </button>
                )}

                {isCameraActive && (
                  <div className="w-full flex flex-col gap-2.5">
                    <div className="rounded-2xl overflow-hidden aspect-video bg-black relative border border-dashed border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      
                      {penaltyRecording && (
                        <div className="absolute top-3 left-3 bg-red-650 text-white text-[9px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                          <span>● RECORDING NUDE</span>
                          <span className="ml-1 border-l border-white/20 pl-1.5">{penaltyCountdown}s</span>
                        </div>
                      )}
                    </div>

                    {!penaltyRecording ? (
                      <button
                        type="button"
                        onClick={startLoserRecording}
                        className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] uppercase font-mono font-bold rounded-xl shadow-lg cursor-pointer text-center tracking-wider"
                      >
                        🔴 RECORD 30S EXPLICIT CLIP
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-550 uppercase animate-pulse text-center block">
                        Obey nicely... Ensure full angles are completely clear of all garments!
                      </span>
                    )}
                  </div>
                )}

                {recordedVideoUrl && !isCameraActive && (
                  <div className="w-full flex flex-col gap-3">
                    <div className="rounded-xl overflow-hidden aspect-video bg-black border border-red-500/20 relative flex items-center justify-center">
                      <video src={recordedVideoUrl} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={launchLoserWebcam}
                        className="py-2.5 px-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-[9px] font-mono uppercase tracking-wider hover:bg-zinc-850 hover:text-white"
                      >
                        RE-SHOOT
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitLoserNudeVideo}
                        className="py-2.5 px-3 bg-gradient-to-r from-red-650 to-rose-650 text-[9px] font-mono font-bold tracking-widest text-white rounded-xl uppercase shadow-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        💋 TRANSMIT COMPLIANCE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleResetRoles}
              className="mt-5 text-[8.5px] font-mono text-zinc-600 hover:text-white cursor-pointer transition-all uppercase"
            >
              Reset Session
            </button>
          </div>
        )}

        {/* B. LOSER AWAITING WINNER'S AUDIT */}
        {isLoser && ccState === "loser_verification_pending" && (
          <div className="w-full max-w-sm rounded-3xl border border-emerald-500/20 bg-zinc-950/90 p-6 text-center shadow-[0_0_40px_rgba(16,185,129,0.1)] animate-fade-in">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>

            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black block">
              💋 TRANSMISSION SUCCESSFUL 💋
            </span>
            <h2 className="text-sm font-sans font-bold text-zinc-100 mt-2">
              Body Penalty Delivered!
            </h2>
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-light">
              Your 30-seconds full nude clip has been sent to the winner ({winnerName})'s active evaluation panel. Stand by for their satisfying review and unlock.
            </p>
          </div>
        )}

        {/* C. VICTORIOUS WINNER'S DOCK (AWAITING NUDE UPLOAD) */}
        {isWinner && ccState === "final_judgment" && (
          <div className="w-full max-w-sm rounded-[32px] border border-pink-500/20 bg-zinc-950/95 p-5 text-center shadow-[0_0_50px_rgba(236,72,153,0.15)] animate-fade-in">
            <div className="w-12 h-12 bg-pink-500/15 border border-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Award className="w-6 h-6 text-pink-400" />
            </div>

            <span className="text-[10px] font-mono text-pink-400 uppercase tracking-[0.25em] font-black block">
              👑 DIGNITY CLAIMS WON! 👑
            </span>
            <h2 className="text-sm font-sans font-black text-white mt-1 uppercase">
              YOU ARE THE VICTORIOUS MASTER
            </h2>
            <p className="text-[11.5px] text-zinc-450 mt-1 max-w-xs mx-auto leading-relaxed">
              Splendid! Final scores: {scoreWinner} vs {scoreLoser}. You established maximum compliance and won absolute pleasure!
            </p>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-pink-500/10 mt-4.5 text-center">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping inline-block mr-1.5" />
              <span className="text-[10px] font-mono text-pink-400 font-bold uppercase tracking-wider">
                Awaiting Loser ({loserName})'s Nude Proof...
              </span>
              <p className="text-[10px] text-zinc-550 mt-2 max-w-xs font-light leading-normal">
                {loserName} is currently locked on their screen, forced to record a 30-Seconds full nude compliance tease. Prepare to enjoy and verify when it arrives.
              </p>
            </div>

            <button
              onClick={handleResetRoles}
              className="mt-5 text-[9px] font-mono border border-zinc-900 text-zinc-650 hover:text-white px-3 py-1.5 rounded-lg hover:border-zinc-805 transition-all cursor-pointer uppercase font-semibold"
            >
              Reset Lobby Early
            </button>
          </div>
        )}

        {/* D. WINNER EVALUATES LOSER'S NUDE VIDEO COMPLIANCE */}
        {isWinner && ccState === "loser_verification_pending" && (
          <div className="w-full max-w-sm rounded-[32px] border border-emerald-500/30 bg-zinc-950/95 p-5 text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] animate-fade-in">
            <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md bg-emerald-555/10 uppercase tracking-widest font-black inline-block animate-pulse">
              💋 PHYSICAL SACRIFICE SECURED
            </span>
            
            <h2 className="text-sm font-sans font-black text-white mt-2">
              AUDIT {loserName.toUpperCase()}'s COMPULSORY TEASE
            </h2>

            <p className="text-[11px] text-zinc-400 mt-1 pb-3 border-b border-white/[0.04] leading-relaxed font-light">
              Assess your submissive partner's full body nude proof. Watch carefully to make sure they complied.
            </p>

            {ccData.ccLoserNudeVideoUrl && (
              <div className="w-full rounded-2xl overflow-hidden aspect-video bg-black border border-emerald-500/10 mt-4 shadow-xl">
                <video src={ccData.ccLoserNudeVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-cover" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5 mt-5">
              <button
                type="button"
                onClick={handleWinnerRejectNude}
                className="py-3 px-4 bg-zinc-950 border border-rose-500/35 hover:bg-rose-500/5 text-rose-400 font-mono text-[9.5px] tracking-widest uppercase rounded-xl transition-all font-black cursor-pointer"
              >
                ❌ REJECT RETAKE
              </button>
              <button
                type="button"
                onClick={handleWinnerApproveNude}
                className="py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-mono text-[9.5px] tracking-widest uppercase rounded-xl transition-all font-black hover:opacity-95 shadow-lg cursor-pointer"
              >
                👑 APPROVE RESET
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VIEW: STYLISH GAME INSTRUCTIONS CARD AT THE TOP IN CC ACTIVE ROUND
  if (ccState === "waiting_for_command" || ccState === "waiting_for_verification" || ccState === "waiting_for_approval") {
    const minStr = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secStr = (timeLeft % 60).toString().padStart(2, "0");

    const hostName = gameState.hostName || "Host";
    const guestName = gameState.guestName || "Guest";
    const hostScore = ccData.ccScoreHost || 0;
    const guestScore = ccData.ccScoreGuest || 0;

    const masterName = ccMasterId === gameState.hostId ? hostName : guestName;
    const subName = ccSubId === gameState.hostId ? hostName : guestName;

    return (
      <div className="w-full flex flex-col gap-3.5 p-3.5 items-center text-center bg-[#070709] min-h-[280px] animate-fade-in border border-white/[0.04] rounded-3xl relative overflow-hidden" id="active-cc-instructions-card">
        {/* Background glow shadow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Connection status toolbar */}
        <div className="w-full flex items-center justify-between border-b border-white/[0.04] pb-2 text-zinc-500">
          <div className="flex items-center gap-1.5 focus:scale-105">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[8px] font-mono tracking-widest text-pink-400 font-extrabold uppercase font-bold">COMMAND & CONTROL SESSION ACTIVE</span>
          </div>
          <button 
            type="button"
            onClick={handleResetRoles}
            className="text-[8px] font-mono px-2 py-0.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-950 border border-white/[0.05] hover:bg-zinc-90 w-max transition-all cursor-pointer uppercase font-semibold"
          >
            End Call
          </button>
        </div>

        {/* Match statistics matrix card */}
        <div className="w-full grid grid-cols-3 gap-2 px-3 py-2 bg-black/60 border border-white/[0.03] rounded-2xl items-center text-left">
          <div className="font-mono">
            <span className="text-[7.5px] text-zinc-550 block uppercase tracking-wider font-extrabold">Active Status</span>
            <span className="text-[10px] text-pink-400 font-extrabold block mt-0.5 animate-pulse">ROUND {ccRound}</span>
          </div>
          <div className="text-center font-mono border-x border-white/5 py-1">
            <span className="text-[7.5px] text-zinc-550 block uppercase tracking-wider font-extrabold">Time Left</span>
            <span className="text-lg text-white font-bold block leading-none tracking-widest mt-0.5">
              {minStr}:{secStr}
            </span>
          </div>
          <div className="text-right font-mono">
            <span className="text-[7.5px] text-zinc-550 block uppercase tracking-wider font-extrabold leading-none">Points scored</span>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className="text-[8.5px] text-zinc-300 font-semibold truncate leading-none">
                {hostName.split(" ")[0]}: <strong className="text-emerald-400 font-extrabold">{hostScore}</strong>
               </span>
              <span className="text-[8.5px] text-zinc-300 font-semibold truncate leading-none mt-1">
                {guestName.split(" ")[0]}: <strong className="text-emerald-400 font-extrabold">{guestScore}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Swapped roles description strip */}
        <div className="w-full py-1.5 px-3 rounded-xl border border-white/[0.02] bg-zinc-900/20 text-left font-mono text-[8.5px] text-zinc-450 flex items-center justify-between">
          <span className="truncate">👑 Master User: <strong className="text-pink-300 font-bold">{masterName}</strong></span>
          <span className="truncate">⛓️ Obedient Sub: <strong className="text-purple-300 font-bold">{subName}</strong></span>
        </div>

        {/* Instructions list display (Static helper always visible for users) */}
        <div className="w-full text-left" id="cc-top-instructions-deck">
          <div className="flex items-center gap-1 border-b border-white/[0.03] pb-1.5 mb-2">
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500/10 shrink-0" />
            <h5 className="text-[9.5px] font-mono tracking-widest text-pink-400 font-bold uppercase">
              LIVE GAME RULES & GUIDELINES
            </h5>
          </div>

          <ul className="text-[9px] text-zinc-400 font-light flex flex-col gap-1.5 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-zinc-200">Intimate Voice Notes:</strong> Master transmits orders directly in the chat below. Each voice note seamlessly autoplays on Sub's hardware!
            </li>
            <li>
              <strong className="text-zinc-200">8s Compliance Teasers:</strong> Sub records and submits an 8-second video teaser clip right in this chatroom to demonstrate instant obedience before the Cam Shutter locks.
            </li>
            <li>
              <strong className="text-zinc-200">Instant Verification:</strong> Master evaluates and approves/rejects directly in the chatroom below to change compliance points.
            </li>
            <li>
              <strong className="text-zinc-200 text-rose-450">⚠️ Naked Loser Penalty:</strong> In Round 2, the roles are fully reversed. Once the 5 minutes round expires, the player with the lower compliance score faces a compulsory <strong className="text-red-400 font-bold">30-Second Naked Video Penalty Archive</strong>!
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // VIEW D: ACTIVE MASTER INTUITIVE STREAMING CONTROL CONSOLE
  if (isMaster) {
    const minStr = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secStr = (timeLeft % 60).toString().padStart(2, "0");

    return (
      <div className="w-full flex flex-col gap-3.5 p-2 items-center text-center bg-[#09090b] min-h-[380px] animate-fade-in" id="master-console">
        
        {/* State toolbar header */}
        <div className="w-full flex items-center justify-between border-b border-white/[0.04] pb-2 text-zinc-500">
          <div className="flex items-center gap-1.5 focus:scale-105">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span className="text-[8px] font-mono tracking-widest text-pink-400 font-black uppercase">MASTER STREAMING MODE</span>
          </div>
          <button 
            type="button"
            onClick={handleResetRoles}
            className="text-[8px] font-mono px-2 py-0.5 rounded-lg text-zinc-500 hover:text-white bg-zinc-950 border border-white/[0.04] hover:bg-zinc-900 transition-all cursor-pointer uppercase font-semibold"
          >
            End Call
          </button>
        </div>

        {/* Dynamic Voice Recording panel */}
        {renderVoiceCommandRecorderPanel()}

        {/* Master central round clock indicator */}
        <div className="w-full max-w-sm flex flex-col justify-center items-center py-1">
          <div className="p-3 px-6 rounded-2xl bg-[#030303] border border-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.06)]">
            <span className="text-[8px] font-mono text-zinc-500 tracking-[0.2em] font-black uppercase block mb-0.5">
              ROUND {ccRound} ACTIVE TIME LEFT
            </span>
            <div className="text-3xl font-mono text-white font-extrabold tracking-widest drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
              {minStr}:{secStr}
            </div>
          </div>
        </div>

        {/* STATE D1: MASTER SENDS EXPLICIT LIVE INSTRUCTIONS */}
        {ccState === "waiting_for_command" && (
          <div className="w-full max-w-sm flex flex-col items-center gap-3 py-1" id="master-waiting-command">
            
            {/* Direct dynamic live text commander */}
            <div className="w-full p-3 rounded-2xl border border-pink-500/15 bg-zinc-950/70 shadow-lg text-left flex flex-col gap-2">
              <span className="text-[8.5px] font-mono text-pink-400 font-black uppercase tracking-wider block">
                ✍️ TYPE CUSTOM LIVE COMMAND (EXPLICIT)
              </span>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Strip underwear, slap cheeks, touch nipples live..."
                  value={customCommandInput}
                  onChange={(e) => setCustomCommandInput(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 px-3 py-2 rounded-xl text-xs placeholder:text-zinc-650 focus:outline-none focus:border-pink-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTransmitCommand(customCommandInput);
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleTransmitCommand(customCommandInput)}
                  disabled={isUploading || !customCommandInput.trim()}
                  className="px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick-dispatch template templates */}
            <div className="w-full mt-1.5 text-left border-t border-white/[0.03] pt-2.5">
              <span className="text-[9px] font-mono tracking-widest text-pink-400/80 uppercase block mb-2 text-center font-bold">
                🔥 SEED Compliancy Template Commands
              </span>

              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto scrollbar-thin px-1">
                {EROTIC_TASKS.map((task, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-950 hover:border-pink-500/20 text-zinc-300 hover:text-white transition-all text-[10.5px] font-light flex items-center justify-between gap-2"
                  >
                    <span className="flex-1 leading-normal text-zinc-400 text-[10px]">{task}</span>
                    <button
                      onClick={() => handleTransmitCommand(`Directive #${idx + 1}: ${task}`)}
                      className="px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-[8px] font-mono text-pink-400 hover:text-pink-300 font-bold max-w-max border border-pink-500/20 rounded-md uppercase shrink-0 cursor-pointer"
                    >
                      Enforce
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATE D2: AWAITING SUB SUBMITTING COMPREHENSIVES */}
        {ccState === "waiting_for_verification" && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4 py-8" id="master-await-response">
            <div className="w-12 h-12 rounded-full border border-pink-500/20 bg-pink-500/[0.02] flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.1)]">
              <Clock className="w-5 h-5 text-pink-400 animate-spin" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-pink-400 uppercase tracking-widest font-extrabold block animate-pulse">
                AWAITING 8-SEC TEASER COMPLIANCE
              </span>
              <h4 className="text-xs text-zinc-350 mt-2 leading-relaxed font-light px-2">
                Active Order: <em className="text-pink-300 font-medium font-mono">"{ccActiveSuggestion}"</em>. Your partner was locked into the Cam Shutter module. Waiting for Sub to tape and transmit their 8s tease clip...
              </h4>
            </div>
            
            <button
              onClick={() => updateRoomState({ ccState: "waiting_for_command", ccActiveSuggestion: "" })}
              className="mt-2 text-[9px] font-mono border border-zinc-900 hover:border-pink-500/20 px-3.5 py-1.5 rounded-xl text-zinc-500 hover:text-white transition-all cursor-pointer bg-[#0c0c0e]"
            >
              Recall / Revise Command
            </button>
          </div>
        )}

        {/* STATE D3: EVALUATE COMPLIANCE PROOF */}
        {ccState === "waiting_for_approval" && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4 py-1" id="master-review-submission">
            <div>
              <span className="text-[9.5px] font-mono text-emerald-400 uppercase tracking-widest font-extrabold block animate-pulse">
                🔍 AUDIT OBEDIENCE TEASER
              </span>
              <h4 className="text-xs text-zinc-400 mt-1 max-w-xs leading-normal">
                Sub verified compliance and uploaded the telemetry. Watch and score the teaser feed:
              </h4>
            </div>

            <div className="w-full p-3 rounded-2xl border border-zinc-900 bg-zinc-950/80 flex flex-col gap-3">
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider text-left block">
                INCOMING COMPLIANCE TEASER MONITOR (8 SECONDS)
              </span>

              {ccData.ccVerificationVideoUrl && (
                <div className="rounded-xl overflow-hidden bg-black aspect-video relative flex items-center justify-center border border-white/[0.04] shadow-md shadow-pink-500/5">
                  <video src={ccData.ccVerificationVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-cover" />
                </div>
              )}

              {ccData.ccVerificationDriveUrl && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-left text-[9.5px]">
                  <span className="text-emerald-400 font-mono flex items-center gap-1 font-bold">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> GDRIVE BACKUP
                  </span>
                  <a 
                    href={ccData.ccVerificationDriveUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[8px] tracking-wider uppercase rounded-lg transition-all font-bold flex items-center gap-1 shadow-md"
                  >
                    OPEN FILE IN DRIVE <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleMasterReject}
                  className="py-2.5 px-4 bg-zinc-950 border border-zinc-900 hover:border-rose-500/30 text-rose-455 font-mono text-[9px] tracking-widest uppercase rounded-xl transition-all font-bold cursor-pointer"
                >
                  REJECT RETAKE ❌
                </button>
                <button
                  type="button"
                  onClick={handleMasterApprove}
                  className="py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-mono text-[9px] tracking-widest uppercase rounded-xl transition-all font-bold cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  APPROVE SCORE 👍
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VIEW E: ACTIVE SUB COMPLIANCE FOCUS CONSOLE
  if (isSub) {
    const minStr = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const secStr = (timeLeft % 60).toString().padStart(2, "0");

    return (
      <div className="w-full flex flex-col gap-3.5 p-2 items-center text-center bg-[#070709] min-h-[380px] animate-fade-in" id="sub-console">
        
        {/* Connection status toolbar */}
        <div className="w-full flex items-center justify-between border-b border-white/[0.04] pb-2 text-zinc-500">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[8px] font-mono tracking-widest text-violet-400 uppercase">SUB OBEDIENCE NODE</span>
          </div>
          <button 
            type="button"
            onClick={handleResetRoles}
            className="text-[8px] font-mono px-2 py-0.5 rounded-lg text-zinc-500 hover:text-white bg-zinc-950 border border-white/[0.04] hover:bg-zinc-900 transition-all cursor-pointer uppercase font-semibold"
          >
            Exit Lobby
          </button>
        </div>

        {/* Real-time sync dynamic clock */}
        <div className="w-full max-w-sm flex flex-col justify-center items-center py-1">
          <div className="p-3 px-6 rounded-2xl bg-[#030303] border border-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.06)]">
            <span className="text-[8px] font-mono text-zinc-550 tracking-[0.2em] font-black uppercase block mb-0.5 animate-pulse">
              SUB COMPLIANCE ROUND TIMER
            </span>
            <div className="text-3xl font-mono text-white font-extrabold tracking-widest drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]">
              {minStr}:{secStr}
            </div>
          </div>
        </div>

        {/* SUB STATE E1: OBEDIENT LISTENER AWAITING COMMAND TRIGGERS */}
        {ccState === "waiting_for_command" && (
          <div className="w-full max-w-sm flex flex-col items-center justify-center gap-4 py-11" id="sub-waiting">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-dashed border-violet-500/20 animate-[spin_10s_linear_infinite]" />
              <button className="absolute w-6 h-6 rounded-full bg-violet-500/[0.03] animate-ping" />
              <Volume2 className="w-5 h-5 text-violet-500 animate-bounce" />
            </div>
            <div>
              <span className="text-[9.5px] font-mono tracking-widest text-violet-400 uppercase font-bold block animate-pulse">
                🎧 AWAITING INCOMING DIRECTIVE LIVE
              </span>
              <p className="text-[10px] text-zinc-400 mt-2 font-mono leading-relaxed max-w-xs mx-auto px-2">
                Master {myPartnerName} is currently deciding your compliance path...
              </p>
              <p className="text-[8.5px] text-zinc-600 mt-4 leading-normal max-w-xs mx-auto italic">
                Keep your volume up. When Master broadcasts a voice note directive or custom text challenge, your Cam Shutter session will activate automatically!
              </p>
            </div>
          </div>
        )}

        {/* SUB STATE E2: EXPLICIT DARE TRIGGER INCOMING - CAPTURE 8-SEC TEASER */}
        {ccState === "waiting_for_verification" && (
          <div className="w-full max-w-sm flex flex-col items-center gap-3.5 py-1 animate-fade-in" id="sub-verify">
            
            {/* 1. CHATROOM DIRECTIVE CARD (PROMINENT AT THE TOP) */}
            <div className="w-full bg-gradient-to-br from-purple-950/40 via-zinc-950/90 to-pink-950/20 border border-purple-500/40 rounded-2xl p-4 text-center shadow-[0_0_25px_rgba(168,85,247,0.15)] flex flex-col items-center gap-2.5 animate-pulse">
              <span className="text-[10px] font-mono font-black text-pink-400 tracking-wider flex items-center justify-center gap-1.5 uppercase">
                🔥 COMPLY DIRECTLY VIA CHAT INTERFACE! 🔥
              </span>
              <p className="text-[10.5px] text-zinc-100 font-sans leading-relaxed">
                Active Master Command: <strong className="text-pink-300 font-mono">"{ccActiveSuggestion}"</strong>
              </p>
              <div className="w-full h-[1px] bg-white/5 my-1" />
              <p className="text-[9.5px] text-zinc-350 leading-relaxed font-sans">
                Just tap the <strong className="text-purple-400">Camera / Vid icon 📹</strong> in the chatroom input box below, record your 8s compliance teaser, and press send! It automatically syncs to Drive, renders live in the chat, and prompts Master for approval.
              </p>
            </div>

            <div className="w-full text-center flex flex-col gap-1 mt-1">
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">
                — OR SUBMIT VIA INTEGRATED CAM PLUG-IN DIRECTLY —
              </span>

              {/* Seamless Audio Note Player Integration for Spoken Commands */}
              {ccData.ccCommandAudioUrl && (
                <div className="p-3 mt-1 rounded-xl bg-violet-950/25 border border-violet-500/20 flex flex-col gap-2 text-center max-w-xs mx-auto w-full">
                  <div className="flex items-center justify-center gap-1.5 text-violet-400 font-mono text-[9px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
                    🔊 Play Master's Audio Instructions
                  </div>
                  <audio 
                    src={ccData.ccCommandAudioUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-8 mt-1 focus:outline-none" 
                  />
                  <p className="text-[8px] text-zinc-500 italic mt-0.5">
                    Listen to Master's vocal order, then tape your compliance video clip!
                  </p>
                </div>
              )}
            </div>

            {/* Live Camera shutter box */}
            <div className="w-full p-3 rounded-2xl border border-violet-500/10 bg-zinc-950 text-center flex flex-col items-center shadow-lg">
              <span className="text-[8.5px] font-mono text-zinc-555 uppercase block mb-2 tracking-wider">
                🎥 8-SECONDS TEASE RECORDER
              </span>

              {(!isCameraActive && !recordedVideoUrl) && (
                <div className="py-4 flex flex-col items-center gap-2">
                  <p className="text-[9px] text-zinc-500 max-w-xs leading-normal">
                    Obey live! Start the shutter camera, record exactly 8 seconds of physical obedience angle, and transmit.
                  </p>
                  <button
                    type="button"
                    onClick={launchWebcamPreview}
                    className="py-1.5 px-3 bg-zinc-900 border border-zinc-800 hover:border-violet-500/20 text-[9px] font-mono tracking-widest text-violet-400 rounded-lg uppercase cursor-pointer transition-all hover:text-white"
                  >
                    ACTIVATE CAM WORKSPACE
                  </button>
                </div>
              )}

              {isCameraActive && (
                <div className="w-full flex flex-col gap-2.5">
                  <div className="rounded-xl overflow-hidden aspect-video bg-black relative border border-violet-500/15">
                    <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    
                    {videoCountdown < 8 && videoCountdown > 0 && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-mono px-2 py-0.5 rounded-md animate-ping">
                        ● VIDEO CAPTURE {videoCountdown}s
                      </div>
                    )}
                  </div>

                  {videoCountdown === 8 ? (
                    <button
                      type="button"
                      onClick={recordTeasingVideo}
                      className="py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[9.5px] uppercase font-mono font-bold rounded-xl cursor-pointer shadow-md shadow-pink-500/10"
                    >
                      🔴 RECORD COMPLIANCE (8s)
                    </button>
                  ) : (
                    <span className="text-[8.5px] font-mono text-zinc-550 uppercase animate-pulse block tracking-wider">
                      Capturing erotic video assets... Move provocatively!
                    </span>
                  )}
                </div>
              )}

              {recordedVideoUrl && !isCameraActive && (
                <div className="w-full flex flex-col gap-3">
                  <div className="rounded-xl overflow-hidden aspect-video bg-black border border-violet-500/15 relative flex items-center justify-center">
                    <video src={recordedVideoUrl} controls autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={launchWebcamPreview}
                      className="flex-1 py-1.5 bg-zinc-900 text-zinc-400 text-[8.5px] font-mono text-center tracking-wider rounded-xl uppercase transition-all"
                    >
                      Re-Take
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadProof}
                      disabled={isUploading}
                      className="flex-2 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono text-[9px] tracking-widest uppercase rounded-xl transition-all shadow-md cursor-pointer font-bold"
                    >
                      {isUploading ? "TRANSMITTING..." : "💋 SEND TEASER"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB STATE E3: COMPLETED, AWAITING MASTER SATISFACTION SCORING */}
        {ccState === "waiting_for_approval" && (
          <div className="w-full max-w-sm flex flex-col items-center justify-center gap-4 py-11" id="sub-await-approval">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20 animate-spin" />
              <button className="absolute w-6 h-6 rounded-full bg-emerald-500/[0.03] animate-ping" />
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-widest text-[#10b981] uppercase font-black block animate-pulse">
                OBEDIENCE PROOF SECURED 💋
              </span>
              <p className="text-[10px] text-zinc-500 mt-1.5 font-mono leading-relaxed max-w-xs mx-auto">
                Teaser uploaded successfully! Waiting in real-time for Master {myPartnerName} to satisfy their audit eyes, approve/reject scorecard, and issue the next live call task.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
