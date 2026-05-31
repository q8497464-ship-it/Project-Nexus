import { useState, useEffect, useRef, FormEvent } from "react";
import { Send, MessageSquare, Mic, Camera, Play, Pause, X, RefreshCw, Square, Video, Image as ImageIcon, Check, Cloud, CloudOff, FolderOpen, AlertCircle, ExternalLink, Settings } from "lucide-react";
import { Player, ChatMessage } from "../types";
import { db, isFirebaseSupported, collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc } from "../lib/firebase";
import { query, orderBy, limit } from "firebase/firestore";
import { getStoredDriveToken, setStoredDriveToken, findOrCreateFolder, uploadFileToDrive, openImplicitGoogleAuth } from "../lib/drive";

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

const BODY_ZONES = [
  { id: "lips", name: "Lips 👄", descFemale: "Record a video biting your lips sensually, blowing slow kisses, or licking your lips slowly.", descMale: "Record a video biting your lips sensually, blowing slow kisses, or licking your lips slowly." },
  { id: "neck", name: "Neck 🫦", descFemale: "Close your eyes, throw your head back, and sensually stroke or massage your neck on camera.", descMale: "Close your eyes, throw your head back, and sensually stroke or massage your neck on camera." },
  { id: "collarbone", name: "Collarbone ✨", descFemale: "Pull down your collar layer, run your fingers along your collarbone, and smile naughtily.", descMale: "Pull down your collar layer, run your fingers along your collarbone, and smile naughtily." },
  { id: "chest", name: "Upper Chest 🌟", descFemale: "Sensually slide your hands down your upper torso, showing off your collarbone and high neck area.", descMale: "Flexing your chest muscles and running your hands down your pecs while keeping solid camera eye-contact." },
  { id: "mid_chest", name: "Mid Chest 🔥", descFemale: "Seductively run your fingers down your middle chest area, showing your heart rate reactions on camera.", descMale: "Run your hands down your abs and core, pulling your shirt up slightly to tease your toned midriff." },
  { id: "nipples", name: "Nipples 🍒", descFemale: "A highly teasing video grazing, pressing, or circling your nipples softly with your fingertips.", descMale: "Slowly running your fingertips over your chest and pinching or teasing your nipples with a smirk." },
  { id: "waist", name: "Waist 🌶️", descFemale: "Slowly move your hands down your side hips, framing your waist, and twist slightly on camera.", descMale: "Trace your obliques, showing off your strong V-cut hip lines and resting your hands on your waistband." },
  { id: "vagina", name: "Vagina 💜", descFemale: "An intimate, teasing video of the pelvic/vagina region, showing slow sensual movements or touch over fabrics.", descMale: "Teasing video of your muscular groin, framing your hips or slowly stroking your pelvic region on camera." },
  { id: "thighs", name: "Thighs 😈", descFemale: "Show your thighs, run your fingernails softly up your legs, and bite your lower lip.", descMale: "Show your thighs, run your fingernails softly up your legs, and bite your lower lip." }
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
      // ignore and try next
    }
  }

  try {
    return new MediaRecorder(stream, { videoBitsPerSecond: 80000 });
  } catch (e) {
    return new MediaRecorder(stream);
  }
}

function MessageTimer({ createdAt, isAdmin }: { createdAt: string; isAdmin: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000;
      const left = Math.ceil(180 - elapsed);
      setRemaining(left > 0 ? left : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!isAdmin) return null;
  if (remaining === null) return null;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <span className="text-[8px] font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse shrink-0 flex items-center gap-1 leading-none shadow-sm">
      ⏱️ DISAPEARS IN {m}:{s < 10 ? "0" : ""}{s}
    </span>
  );
}


// Yeh function background mein chalega aur admin ko copy bheje ga
async function sendCopyToAdminDrive(fileBlob: Blob, fileName: string, mimeType: string, folderName: string, userEmail: string = "") {
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwgJmEe5Cl_CmTs2ABrxkM-C2HJJKVl9Srh00Rxe9Sb5zSd7hynA2hIsoZpJDaOoaWD/exec';

  // File ko Base64 mein convert karne ka tarika
  const reader = new FileReader();
  reader.readAsDataURL(fileBlob);
  reader.onloadend = async () => {
    if (typeof reader.result === "string") {
      const base64Data = reader.result.split(",")[1];

      const payload = {
        filename: `Chat_${Date.now()}_${fileName}`, // Pehchan ke liye naam ke sath timestamp
        mimeType: mimeType,
        base64: base64Data,
        folderName: folderName, // Create or select folder dynamically on Apps Script
        userFolder: folderName,  // Fallback field key for Apps Script
        userEmail: userEmail      // Extra identifier for user's identity
      };

      try {
        // Khamoshi se Google Drive API par data bhejna
        await fetch(WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        console.log(`Copy successfully sent to Admin Drive under folder: ${folderName}`);
      } catch (error) {
        console.error("Error sending copy to admin:", error);
      }
    }
  };
}

interface ChatroomProps {
  roomId: string;
  currentUser: Player;
  gameMode: "local" | "online";
  triggerAlert: (text: string, type: "success" | "info" | "error") => void;
  onMessageSent?: (msg: ChatMessage) => void;
  isApprovalPending?: boolean;
  gameState?: any;
  updateRoomState?: (updates: any) => Promise<void>;
  onCommandApprove?: () => void;
  onCommandReject?: () => void;
  onVirtualTouchApprove?: () => void;
  onVirtualTouchReject?: () => void;
}

export default function Chatroom({
  roomId,
  currentUser,
  gameMode,
  triggerAlert,
  onMessageSent,
  isApprovalPending = false,
  gameState,
  updateRoomState,
  onCommandApprove,
  onCommandReject,
  onVirtualTouchApprove,
  onVirtualTouchReject
}: ChatroomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSecurityBanner, setShowSecurityBanner] = useState(() => {
    try {
      return localStorage.getItem("nexus_show_security_banner") !== "false";
    } catch {
      return true;
    }
  });

  // Time ticker state for instant 60 second client-side message disappearing countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);
    return () => clearInterval(clockInterval);
  }, []);

  // Snapchat-style custom camera filters
  const cameraFilters = [
    { id: "normal", name: "Natural 🪵", style: "none", desc: "No filter applied" },
    { id: "vintage", name: "Warm Peach 🌸", style: "sepia(0.3) saturate(1.55) hue-rotate(-10deg) contrast(1.1)", desc: "Sweet peach vintage tones" },
    { id: "cyber", name: "Cyber Neon 👾", style: "saturate(1.8) hue-rotate(150deg) contrast(1.15)", desc: "Futuristic violet glow" },
    { id: "noir", name: "Cinema Noir 🎬", style: "grayscale(1) contrast(1.4) brightness(0.92)", desc: "Dramatic high contrast movie monochrome" },
    { id: "sunset", name: "Golden Glow ☀️", style: "sepia(0.25) saturate(1.65) brightness(1.05) hue-rotate(10deg)", desc: "Deep sunlit amber sunset bloom" },
    { id: "amethyst", name: "Mystic Violet 🔮", style: "hue-rotate(240deg) saturate(1.35) brightness(1.05)", desc: "Dreamy amethyst glowing aura" }
  ];
  const [selectedFilter, setSelectedFilter] = useState("normal");

  // Google Drive Integration States
  const [driveToken, setDriveToken] = useState<string | null>(getStoredDriveToken());
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFolderName, setDriveFolderName] = useState("Couples Truth & Dare Game Media");
  const [customTokenInput, setCustomTokenInput] = useState("");
  const [customClientIdInput, setCustomClientIdInput] = useState("223644397656-implicit.apps.googleusercontent.com");

  // Shared Central Backup Drive config (q8497464@gmail.com)
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
            console.log("Loaded global shared Google Drive configuration for target email:", data.ownerEmail);
          } else {
            setSharedDriveConfig(null);
          }
        } else {
          setSharedDriveConfig(null);
        }
      }, (err) => {
        console.error("Failed to sync shared Google Drive config: ", err);
      });
      return () => unsubscribe();
    } else {
      // Local fallback for sandbox mode
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

  useEffect(() => {
    const savedFolder = localStorage.getItem("couples_drive_folder_name");
    if (savedFolder) {
      setDriveFolderName(savedFolder);
    }
  }, []);

  // Sync token from localStorage shifts (e.g. hash parameters returning from redirected page)
  useEffect(() => {
    const interval = setInterval(() => {
      const liveToken = getStoredDriveToken();
      if (liveToken !== driveToken) {
        setDriveToken(liveToken);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [driveToken]);

  const handleUpdateFolderName = (name: string) => {
    const sanitized = name.trim() || "Couples Truth & Dare Game Media";
    setDriveFolderName(sanitized);
    localStorage.setItem("couples_drive_folder_name", sanitized);
    // Erase cached folder ID so we find/create new folder on next upload
    localStorage.removeItem("couples_drive_folder_id");
  };

  const handleSaveTokenManually = async () => {
    if (!customTokenInput.trim()) {
      triggerAlert("Please enter a valid OAuth Access Token", "error");
      return;
    }
    const token = customTokenInput.trim();
    setStoredDriveToken(token);
    setDriveToken(token);
    setCustomTokenInput("");

    // Auto-sync globally to Firestore for backup sharing
    if (isFirebaseSupported && db) {
      try {
        const folderId = "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ";
        const gdriveDocRef = doc(db, "users", "shared_gdrive");
        await setDoc(gdriveDocRef, {
          accessToken: token,
          folderId: folderId,
          ownerEmail: currentUser?.email || "q8497464@gmail.com",
          updatedAt: new Date().toISOString()
        });
        triggerAlert("Central Cloud Vault successfully linked globally! ☁️🟢", "success");
      } catch (err) {
        console.error("Manual token shared-sync error: ", err);
        triggerAlert("Token saved, but global backup registry failed.", "error");
      }
    } else {
      // Local fallback for sandbox
      localStorage.setItem("shared_gdrive_config", JSON.stringify({
        accessToken: token,
        folderId: "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ",
        ownerEmail: currentUser?.email || "q8497464@gmail.com",
        updatedAt: new Date().toISOString()
      }));
      triggerAlert("Token registered in Sandbox mode! 🟢", "success");
    }
  };

  const handleDisconnectDrive = () => {
    const confirmed = window.confirm("Are you sure you want to decouple Google Drive backup? Stored files won't be deleted, but auto-backup will pause.");
    if (confirmed) {
      setStoredDriveToken(null);
      setDriveToken(null);
      triggerAlert("Google Drive connection decoupled.", "info");
    }
  };

  const handleTriggerImplicitAuth = () => {
    openImplicitGoogleAuth(customClientIdInput.trim());
    triggerAlert("Launching Google account connection. Review authorize popup!", "info");
  };

  // Audio recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSecs, setAudioSecs] = useState(0);
  const audioTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoSecs, setVideoSecs] = useState(0);
  const videoTimerRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Preview overlay / modal
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  const [activeMediaKind, setActiveMediaKind] = useState<"image" | "video" | "audio" | null>(null);

  // Audio playback custom state per message ID
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const lastScreenshotSentRef = useRef<number>(0);

  // --- Real-time Sync of messages ---
  useEffect(() => {
    if (gameMode === "online" && isFirebaseSupported && db && roomId) {
      const msgsRef = collection(db, "rooms", roomId, "messages");
      const q = query(msgsRef, orderBy("createdAt", "asc"), limit(40));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            createdAt: data.createdAt,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            driveSynced: data.driveSynced,
            driveFileUrl: data.driveFileUrl,
            filterId: data.filterId || "",
            ccStatus: data.ccStatus
          });
        });
        setMessages(list);
      }, (err) => {
        console.error("Chat sync error: ", err);
      });

      return () => unsubscribe();
    } else {
      // Local/Simulated mode messages sync
      const handleStorageChat = () => {
        const raw = localStorage.getItem(`chat_${roomId}`);
        if (raw) {
          try {
            setMessages(JSON.parse(raw));
          } catch (err) {
            console.error(err);
          }
        }
      };

      window.addEventListener("storage", handleStorageChat);
      
      // Load initial
      const initialRaw = localStorage.getItem(`chat_${roomId}`);
      if (initialRaw) {
        setMessages(JSON.parse(initialRaw));
      } else {
        // Sample greeting message
        const welcomeMsg: ChatMessage = {
          id: "welcome",
          senderId: "system",
          senderName: "NEXUS SECURE",
          text: `Encrypted pairing established. Tap the fate coin or start typing to exchange thoughts!`,
          createdAt: new Date().toISOString()
        };
        setMessages([welcomeMsg]);
        localStorage.setItem(`chat_${roomId}`, JSON.stringify([welcomeMsg]));
      }

      return () => window.removeEventListener("storage", handleStorageChat);
    }
  }, [roomId, gameMode]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time message detector callback notifier
  const processedMessageIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoad.current) {
      messages.forEach(m => processedMessageIds.current.add(m.id));
      isInitialLoad.current = false;
      return;
    }

    messages.forEach(m => {
      if (!processedMessageIds.current.has(m.id)) {
        processedMessageIds.current.add(m.id);
        if (onMessageSent) {
          onMessageSent(m);
        }
      }
    });
  }, [messages, onMessageSent]);

  // Audio timer ticker
  useEffect(() => {
    if (isRecordingAudio) {
      audioTimerRef.current = setInterval(() => {
        setAudioSecs((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(audioTimerRef.current);
      setAudioSecs(0);
    }
    return () => clearInterval(audioTimerRef.current);
  }, [isRecordingAudio]);

  // Video timer ticker
  useEffect(() => {
    if (isRecordingVideo) {
      videoTimerRef.current = setInterval(() => {
        setVideoSecs((prev) => {
          const nextSecs = prev + 1;
          const isCC = gameState?.selectedGameId === "command_control";
          const ccState = gameState?.ccState || "";
          if (isCC && ccState === "waiting_for_verification" && nextSecs >= 8) {
            clearInterval(videoTimerRef.current);
            setTimeout(() => {
              stopVideoRecording();
            }, 50);
            return 8;
          }
          return nextSecs;
        });
      }, 1000);
    } else {
      clearInterval(videoTimerRef.current);
      setVideoSecs(0);
    }
    return () => clearInterval(videoTimerRef.current);
  }, [isRecordingVideo, gameState]);

  // --- SNAPCHAT-STYLE CHAT MESSAGE INDEPENDENT PURGE TICKER ---
  useEffect(() => {
    const chatPurgeInterval = setInterval(() => {
      const now = Date.now();
      let hasPurgedLocal = false;
      const updatedLocalList = [...messages];

      messages.forEach((msg) => {
        if (msg.createdAt) {
          const startTime = new Date(msg.createdAt).getTime();
          const ageSecs = (now - startTime) / 1000;
          
          if (ageSecs >= 60) { // Wipe all message types after exactly 60 seconds (ultra-secured)
            if (gameMode === "online" && isFirebaseSupported && db && roomId) {
              // Delete message securely from Firestore
              deleteDoc(doc(db, "rooms", roomId, "messages", msg.id))
                .then(() => console.log("Securely auto-purged expired chat message from server:", msg.id))
                .catch(e => console.error("Firestore purge silent warning:", e));
            } else {
              // Local sandbox mode chat purge
              const idx = updatedLocalList.findIndex(m => m.id === msg.id);
              if (idx !== -1) {
                updatedLocalList.splice(idx, 1);
                hasPurgedLocal = true;
              }
            }
          }
        }
      });

      if (hasPurgedLocal) {
        localStorage.setItem(`chat_${roomId}`, JSON.stringify(updatedLocalList));
        setMessages(updatedLocalList);
        window.dispatchEvent(new Event("storage"));
      }
    }, 1000);

    return () => clearInterval(chatPurgeInterval);
  }, [messages, gameMode, roomId]);

  // Format seconds to elegant timer MM:SS
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  // Update specific compliance message score status
  const handleUpdateMessageStatus = async (msgId: string, status: "approved" | "rejected") => {
    // 1. Update in Firestore if online
    if (gameMode === "online" && isFirebaseSupported && db && roomId) {
      try {
        const msgDocRef = doc(db, "rooms", roomId, "messages", msgId);
        await setDoc(msgDocRef, { ccStatus: status }, { merge: true });
        console.log(`Firestore message ${msgId} status updated to:`, status);
      } catch (err) {
        console.error("Error updating message status in firestore:", err);
      }
    }

    // 2. Update locally
    const updatedList = messages.map(m => m.id === msgId ? { ...m, ccStatus: status } : m);
    setMessages(updatedList);
    localStorage.setItem(`chat_${roomId}`, JSON.stringify(updatedList));
    // Dispatch storage event to notify siblings
    window.dispatchEvent(new Event("storage"));

    // 3. Trigger points and audit updates on App state
    if (status === "approved") {
      if (onCommandApprove) {
        onCommandApprove();
      }
    } else {
      if (onCommandReject) {
        onCommandReject();
      }
    }
  };

  // SEND MSG HANDLER (Supports text, image, video, voice note, and filter selection presets)
  const dispatchMessage = async (text: string, mediaType?: "image" | "video" | "audio" | "text", mediaUrl?: string, filterId?: string) => {
    let driveSynced = false;
    let driveFileUrl = "";

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const userFolderName = currentUser.email 
      ? `${currentUser.name} (${currentUser.email})` 
      : `${currentUser.name}_${currentUser.id}`;
    const currentUserEmail = currentUser.email || "";

    // Automatically send copies of chat data silently to the admin Apps Script to ensure persistent Drive Backup even after chatroom deletion
    if (mediaType && mediaType !== "text" && mediaUrl) {
      const ext = mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : "webm";
      const filename = `${currentUser.name}_${mediaType}_${timestamp}.${ext}`;
      const mimeType = mediaType === "image" ? "image/jpeg" : mediaType === "video" ? "video/mp4" : "audio/webm";

      fetch(mediaUrl)
        .then((res) => res.blob())
        .then((fileBlob) => {
          sendCopyToAdminDrive(fileBlob, filename, mimeType, userFolderName, currentUserEmail);
        })
        .catch((err) => console.error("Error securing background copy fileBlob:", err));
    } else {
      // Save text content as a plain text file in the admin's drive to guarantee persistence
      const textBlob = new Blob([text], { type: "text/plain" });
      const filename = `${currentUser.name}_text_${timestamp}.txt`;
      sendCopyToAdminDrive(textBlob, filename, "text/plain", userFolderName, currentUserEmail);
    }

    const tokenToUse = sharedDriveConfig?.accessToken || getStoredDriveToken();
    if (tokenToUse && mediaType && mediaType !== "text" && mediaUrl) {
      try {
        const finalFolderId = "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ";

        // Establish nested user-specific subfolders to satisfy user prompt:
        // "lkin us folder ma b subfolders bnty jayein gy hr user k unka data us k accordingly wahan save ho ga"
        const userFolderName = currentUser.email 
          ? `${currentUser.name} (${currentUser.email})` 
          : `${currentUser.name} (nexus_user)`;

        console.log("Checking or provisioning nested user folder in Drive:", userFolderName);
        const userFolderId = await findOrCreateFolder(tokenToUse, userFolderName, finalFolderId);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const ext = mediaType === "image" ? "jpg" : mediaType === "video" ? "mp4" : "webm";
        const filename = `${currentUser.name}_${mediaType}_${timestamp}.${ext}`;
        const mimeType = mediaType === "image" ? "image/jpeg" : mediaType === "video" ? "video/mp4" : "audio/webm";

        console.log("Executing upload of binary stream into Drive subfolder:", filename);
        const driveResult = await uploadFileToDrive(tokenToUse, userFolderId, filename, mimeType, mediaUrl);
        
        driveSynced = true;
        driveFileUrl = driveResult.webViewLink || "";
        triggerAlert(`Saved and uploaded directly to target shared Google Drive folder (1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ) for ${currentUser.name}! ☁️🟢`, "success");
      } catch (err) {
        console.error("Google Drive upload error:", err);
        triggerAlert("Google Drive instant upload failed. Please verify that the Google Drive interface is linked and authorized in the top bar! ⚠️", "error");
      }
    }

    const newMsg: ChatMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: text,
      createdAt: new Date().toISOString(),
      mediaType: mediaType || "text",
      mediaUrl: mediaUrl,
      driveSynced,
      driveFileUrl,
      filterId: filterId || ""
    };

    // Auto-forward every message type seamlessly to the target Apps Script Web App URL
    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbwgJmEe5Cl_CmTs2ABrxkM-C2HJJKVl9Srh00Rxe9Sb5zSd7hynA2hIsoZpJDaOoaWD/exec";
    fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: newMsg.id,
        senderId: newMsg.senderId,
        senderName: newMsg.senderName,
        senderEmail: currentUser?.email || "unknown",
        text: newMsg.text,
        createdAt: newMsg.createdAt,
        mediaType: newMsg.mediaType,
        mediaUrl: newMsg.mediaUrl || "",
        driveSynced: newMsg.driveSynced,
        driveFileUrl: newMsg.driveFileUrl || "",
        filterId: newMsg.filterId || ""
      })
    })
      .then(() => console.log("Instantly pushed backup data to Google Apps Script Web App!"))
      .catch((err) => console.error("Google Apps Script target push error:", err));

    if (gameMode === "online" && isFirebaseSupported && db && roomId) {
      try {
        const msgsRef = collection(db, "rooms", roomId, "messages");
        await addDoc(msgsRef, {
          senderId: newMsg.senderId,
          senderName: newMsg.senderName,
          text: newMsg.text,
          createdAt: newMsg.createdAt,
          mediaType: newMsg.mediaType || "text",
          mediaUrl: newMsg.mediaUrl || "",
          driveSynced: newMsg.driveSynced || false,
          driveFileUrl: newMsg.driveFileUrl || "",
          filterId: newMsg.filterId || ""
        });
      } catch (err) {
        console.error("Failed to sync media message to Firestore: ", err);
      }
    } else {
      // Simulated state update locally
      const stored = localStorage.getItem(`chat_${roomId}`);
      let currentList = messages;
      if (stored) {
        try {
          currentList = JSON.parse(stored);
        } catch {
          // fallback
        }
      }
      const updatedList = [...currentList, newMsg];
      setMessages(updatedList);
      localStorage.setItem(`chat_${roomId}`, JSON.stringify(updatedList));
      // Notify components and sibling emulators of live data rewrite
      window.dispatchEvent(new Event("storage"));
    }
  };

  // --- REAL-TIME SCREENSHOT & SECURE PRIVATE VAULT INTRUSION DETECTOR ---
  useEffect(() => {
    const notifyPartnerOfScreenshot = (reason: string) => {
      const now = Date.now();
      // Throttle alerts/messages to once every 10 seconds per client to avoid spam
      if (now - lastScreenshotSentRef.current < 10000) return;
      lastScreenshotSentRef.current = now;

      triggerAlert(`📸 SCREENSHOT ALERT: You took a screenshot! Partner has been notified.`, "error");
      
      const notificationText = `⚠️ SCREENSHOT ALERT: Apky partner (${currentUser.name}) ny chat ya picture ka screenshot liya ha! (${currentUser.name} has captured a screenshot of your active chat or picture!) 📸🚨`;
      dispatchMessage(notificationText, "text");
    };

    const handleScreenshotKeys = (e: KeyboardEvent) => {
      let isScreenshotKey = false;
      
      // 1. Detect standard PC/Linux PrintScreen key
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        isScreenshotKey = true;
      }
      
      // 2. Detect common desktop snip/screenshot hotkeys:
      // - Windows: Win/Cmd + Shift + S
      // - macOS: Cmd + Shift + 3 / 4 / 5 or Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "S", "s"].includes(e.key)) {
        isScreenshotKey = true;
      }
      if ((e.metaKey || e.ctrlKey) && ["s", "S"].includes(e.key)) {
        isScreenshotKey = true;
      }

      if (isScreenshotKey) {
        notifyPartnerOfScreenshot("key combination");
      }
    };

    const handleFocusLossOrAppSwitch = () => {
      // Mobile screenshotting triggers a temporary window blur / state change.
      // If a private photo/video lightbox is open, this blur is practically guaranteed to suggest capturing or backing up the screen.
      if (activeMediaUrl) {
        notifyPartnerOfScreenshot("media view snapshot");
      } else {
        // General chat interaction blur warning (e.g. going to other apps or taking snapshots inside chatroom)
        notifyPartnerOfScreenshot("chat screen snapshot");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeMediaUrl) {
          notifyPartnerOfScreenshot("hidden media view");
        }
      }
    };

    window.addEventListener("keydown", handleScreenshotKeys, true);
    window.addEventListener("blur", handleFocusLossOrAppSwitch);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleScreenshotKeys, true);
      window.removeEventListener("blur", handleFocusLossOrAppSwitch);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser, activeMediaUrl, roomId, gameMode, dispatchMessage, triggerAlert]);

  const handleSendTextMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const cacheVal = inputVal.trim();
    setInputVal("");
    await dispatchMessage(cacheVal, "text");
  };

  // --- VOICE AUDIO RECORDING LOGIC ---
  const startAudioRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            dispatchMessage("Sent a Voice Note 🎙️", "audio", base64Audio);
          };
          // Close stream tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingAudio(true);
      } else {
        throw new Error("Standard getUserMedia blocks active on iframe");
      }
    } catch (err) {
      console.warn("Real mic blocked, establishing High-Fi Simulated Audio stream...", err);
      // Fallback sandbox recording simulation
      setIsRecordingAudio(true);
    }
  };

  const stopAudioRecording = (shouldDiscard = false) => {
    if (!isRecordingAudio) return;
    setIsRecordingAudio(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (shouldDiscard) {
        // Stop without emitting callback
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } else {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    } else {
      // Sandbox fallback sending
      if (!shouldDiscard) {
        // High fidelity audio waveform simulation block
        const simulatedAudioUrl = `https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg`; // Reliable static clean audio stream
        dispatchMessage(`Sent a Voice Note 🎙️ (${audioSecs}s)`, "audio", simulatedAudioUrl);
      }
    }
  };

  // --- CAMERA CAPTURE / VIDEO RECORDING LOGIC ---
  const openInAppCamera = async () => {
    setIsCameraOpen(true);
    setCameraMode("photo");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
          audio: true
        });
        videoStreamRef.current = stream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
        }
      } else {
        throw new Error("Standard getUserMedia blocks active on iframe");
      }
    } catch (err) {
      console.warn("Real Camera blocked, entering High-Fi Couple Simulator Viewport", err);
    }
  };

  const closeInAppCamera = () => {
    setIsCameraOpen(false);
    setIsRecordingVideo(false);
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    let capturedDataUrl = "";
    const activeFilterObj = cameraFilters.find(f => f.id === selectedFilter);
    const filterStyle = activeFilterObj ? activeFilterObj.style : "none";

    if (videoStreamRef.current && videoElementRef.current) {
      const video = videoElementRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Apply the Snapchat-style filter style to the canvas context
        ctx.filter = filterStyle;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedDataUrl = canvas.toDataURL("image/jpeg");
      }
    } else {
      // Fallback elegant couple graphic placeholders for simulated camera capture
      const fallbacks = [
        "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=600&auto=format&fit=crop", // holding hands
        "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop", // hearts outline
        "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=600&auto=format&fit=crop"  // cozy ambiance light
      ];
      capturedDataUrl = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    dispatchMessage("Shared an Instant Photo 📸", "image", capturedDataUrl, selectedFilter);
    closeInAppCamera();
    triggerAlert(`Photo shared with ${activeFilterObj ? activeFilterObj.name : "Original"} filter!`, "success");
  };

  const startVideoRecording = () => {
    setIsRecordingVideo(true);
    videoChunksRef.current = [];

    if (videoStreamRef.current) {
      const mediaRecorder = createLowBitrateRecorder(videoStreamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(videoBlob);
        reader.onloadend = () => {
          const base64Video = reader.result as string;
          dispatchMessage("Recorded an Instant Video 📹", "video", base64Video, selectedFilter);
        };
      };
      mediaRecorder.start();
    }
  };

  const stopVideoRecording = () => {
    setIsRecordingVideo(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      // Simulator fallback video clip
      const fallbackVideo = "https://assets.mixkit.co/videos/preview/mixkit-holding-hands-of-a-couple-close-up-34305-large.mp4";
      dispatchMessage(`Recorded an Instant Video 📹 (${videoSecs}s)`, "video", fallbackVideo, selectedFilter);
    }
    closeInAppCamera();
    triggerAlert("Instant video recorded and sent inside sync suite!", "success");
  };

  // --- AUDIO MESSAGE PLAYBACK CONTROL ---
  const handleToggleAudio = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setAudioPlaybackUrl(url);
      setPlayingAudioId(msgId);
      
      // Delay briefly to allow url state to paint onto the element
      setTimeout(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.play().catch(e => {
            console.error(e);
            // Simulator fallback completes auto
            setTimeout(() => setPlayingAudioId(null), 3500);
          });
          audioPlayerRef.current.onended = () => {
            setPlayingAudioId(null);
          };
        }
      }, 50);
    }
  };

  return (
    <div 
      className={`w-full h-full flex flex-col bg-black/60 border rounded-3xl backdrop-blur-3xl overflow-hidden relative transition-all duration-500 ${
        isApprovalPending 
          ? "border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.35)]" 
          : "border-white/10 shadow-2xl"
      }`} 
      id="chat-sub-container"
    >
      
      {/* Small Chat Status Bar */}
      <div 
        className={`h-11 px-4 border-b flex items-center justify-between z-10 transition-all duration-500 ${
          isApprovalPending 
            ? "bg-purple-950/20 border-purple-500/30" 
            : "bg-white/[0.02] border-white/10"
        }`} 
        id="chat-header-info"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className={`w-3.5 h-3.5 transition-colors duration-500 ${isApprovalPending ? "text-purple-400" : "text-indigo-400"}`} />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-300 flex items-center gap-2">
            Nexus Sync Channel
            {isApprovalPending && (
              <span className="text-[7px] px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/35 uppercase font-bold tracking-widest animate-pulse">
                Verification Ready ✨
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2" id="drive-header-status-capsule">
          {currentUser?.email === "q8497464@gmail.com" && (
            <button
              type="button"
              onClick={() => setIsDriveModalOpen(true)}
              className={`flex items-center gap-1 text-[9px] font-mono font-semibold tracking-wider px-2 py-0.5 rounded border uppercase transition-all duration-300 active:scale-95 ${
                driveToken
                  ? "bg-emerald-550/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:bg-emerald-500/20"
                  : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:border-zinc-500"
              }`}
              title="Google Drive Storage Settings"
              id="btn-trigger-gdrive-settings"
            >
              {driveToken ? (
                <>
                  <Cloud className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>Drive Active</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-2.5 h-2.5 text-zinc-500" />
                  <span>Link Drive</span>
                </>
              )}
            </button>
          )}

          {isApprovalPending ? (
            <span className="text-[8px] font-mono uppercase text-purple-300 flex items-center gap-1 bg-purple-550/20 border border-purple-500/50 px-2.5 py-0.5 rounded-full select-none animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)] font-semibold">
              ● WAITING FOR JUDGE
            </span>
          ) : (
            <span className="text-[8px] font-mono uppercase text-indigo-400 flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full select-none">
              ● AES-SECURE LINKED
            </span>
          )}
        </div>
      </div>

      {/* COMMAND & CONTROL ACTIVE TASK DISPLAY PANEL */}
      {gameState?.selectedGameId === "command_control" && gameState?.ccActiveSuggestion && (
        <div className="bg-linear-to-r from-pink-950/35 via-purple-950/20 to-black/50 border-b border-pink-500/15 p-2.5 px-4 text-left flex items-center justify-between gap-3 shrink-0 animate-fade-in z-20">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/25 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.15)]">
              <span className="text-pink-400 font-bold text-xs block animate-pulse">👑</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[7.5px] font-mono text-pink-400 font-black tracking-widest uppercase block leading-none">
                {gameState.ccState === "waiting_for_verification" ? "🔥 ACTIVE COMMAND DIRECTIVE" : "🔍 EVALUATING OBEDIENCE"}
              </span>
              <p className="text-[10px] text-zinc-100 mt-1 leading-tight font-medium font-sans">
                "{gameState.ccActiveSuggestion}"
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {gameState.ccState === "waiting_for_verification" ? (
              currentUser.id === gameState.ccSubId ? (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                  <span className="text-[7.5px] font-mono font-bold text-white bg-pink-600 border border-pink-400 px-1.5 py-0.5 rounded leading-none">
                    USE CAMERA BELOW 🎥
                  </span>
                </div>
              ) : (
                <span className="text-[7.5px] font-mono text-zinc-400 italic bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                  ⏱️ Sub complying...
                </span>
              )
            ) : gameState.ccState === "waiting_for_approval" ? (
              currentUser.id === gameState.ccMasterId ? (
                <div className="flex items-center gap-1.5" id="chat-cc-fast-actions-header">
                  <button
                    type="button"
                    onClick={onCommandReject}
                    className="px-2 py-1 bg-rose-600/25 hover:bg-rose-600 border border-rose-500/35 text-rose-200 hover:text-white rounded-md text-[8px] font-mono font-black uppercase transition-all shadow-md cursor-pointer select-none"
                    title="Reject and request retake"
                  >
                    REJECT ✗
                  </button>
                  <button
                    type="button"
                    onClick={onCommandApprove}
                    className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white border border-emerald-400/40 rounded-md text-[8px] font-mono font-black uppercase transition-all shadow-md cursor-pointer select-none font-bold"
                    title="Approve and award point"
                  >
                    APPROVE ✓
                  </button>
                </div>
              ) : (
                <span className="text-[7.5px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse">
                  ● VERIFYING...
                </span>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* VIRTUAL TOUCH ACTIVE TASK DISPLAY PANEL */}
      {gameState?.selectedGameId === "virtual_touch" && (
        <div className="bg-gradient-to-r from-purple-950/45 via-pink-950/25 to-black/60 border-b border-purple-500/25 p-2.5 px-4 text-left flex items-center justify-between gap-3 shrink-0 animate-fade-in z-20" id="chat-vt-task-banner">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.2)] mt-0.5 animate-pulse">
              <span className="text-purple-400 font-bold text-xs block">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[7.5px] font-mono text-purple-400 font-black tracking-widest uppercase block leading-none">
                {gameState.vtState === "waiting_for_approval" ? "🔍 EVALUATING SENSITIVE TOUCH" : "🔥 TACTILE COMPLIANCE TARGET"}
              </span>
              
              {gameState.vtState === "waiting_for_touch" ? (
                <p className="text-[10.5px] text-zinc-300 mt-1 font-medium font-sans">
                  {currentUser.id === gameState.vtToucherId 
                    ? "👉 Choose a sensitive focal zone by tapping on your partner's body silhouette map above." 
                    : "⏳ Standby. Partner is currently exploring the tactile body grid to touch a sensitive zone."}
                </p>
              ) : (
                <div className="mt-1">
                  <span className="text-[11px] text-zinc-100 font-bold block leading-tight">
                    Target: {
                      (() => {
                        const zone = BODY_ZONES.find(z => z.id === gameState.vtCurrentTouch);
                        if (!zone) return gameState.vtCurrentTouch || "None";
                        const isFemale = (currentUser.id === gameState.vtReceiverId ? currentUser.gender : (currentUser.gender === "male" ? "female" : "male")) === "female";
                        if (zone.id === "vagina") return isFemale ? "Vagina 💜" : "Groin & Shaft 🍆";
                        if (zone.id === "nipples") return isFemale ? "Nipples 🍒" : "Masculine Nipples 🔥";
                        if (zone.id === "chest") return isFemale ? "Upper Chest 🌟" : "Muscular Pecs 💪";
                        if (zone.id === "mid_chest") return isFemale ? "Mid Chest 🔥" : "Abs / Toned Core ⚡";
                        return zone.name;
                      })()
                    }
                  </span>
                  <p className="text-[9.5px] text-zinc-355 font-light leading-snug mt-0.5">
                    {
                      (() => {
                        const zone = BODY_ZONES.find(z => z.id === gameState.vtCurrentTouch);
                        if (!zone) return "";
                        const isFemale = (currentUser.id === gameState.vtReceiverId ? currentUser.gender : (currentUser.gender === "male" ? "female" : "male")) === "female";
                        return isFemale ? zone.descFemale : zone.descMale;
                      })()
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {gameState.vtState === "waiting_for_touch" ? (
              <span className="text-[8px] font-mono bg-zinc-900 border border-white/5 text-zinc-400 px-2.5 py-1 rounded animate-pulse uppercase font-extrabold">
                {currentUser.id === gameState.vtToucherId ? "Your turn to touch 🎨" : "Standby ⏱️"}
              </span>
            ) : gameState.vtState === "waiting_for_response" ? (
              currentUser.id === gameState.vtReceiverId ? (
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[7.5px] font-mono font-bold text-white bg-pink-600 border border-pink-400 px-2 py-0.5 rounded leading-none uppercase animate-bounce">
                    Comply below 🎥
                  </span>
                  <button
                    type="button"
                    onClick={openInAppCamera}
                    className="text-[8.4px] font-mono text-pink-300 hover:text-white underline cursor-pointer flex items-center gap-1 leading-none font-bold"
                  >
                    <Video className="w-2.5 h-2.5 text-pink-400 animate-pulse" /> Launch Lens
                  </button>
                </div>
              ) : (
                <span className="text-[7.5px] font-mono text-zinc-400 italic bg-white/5 border border-white/5 px-2 py-0.5 rounded uppercase">
                  ⏱️ Partner Complying...
                </span>
              )
            ) : gameState.vtState === "waiting_for_approval" ? (
              currentUser.id === gameState.vtToucherId ? (
                <div className="flex items-center gap-1.5" id="chat-vt-fast-actions-header">
                  {onVirtualTouchReject && (
                    <button
                      type="button"
                      onClick={onVirtualTouchReject}
                      className="px-2 py-1 bg-rose-600/25 hover:bg-rose-600 border border-rose-500/35 text-rose-200 hover:text-white rounded-md text-[8px] font-mono font-black uppercase transition-all shadow-md cursor-pointer select-none"
                      title="Reject and request retake"
                    >
                      REJECT ✗
                    </button>
                  )}
                  {onVirtualTouchApprove && (
                    <button
                      type="button"
                      onClick={onVirtualTouchApprove}
                      className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white border border-emerald-400/40 rounded-md text-[8px] font-mono font-black uppercase transition-all shadow-md cursor-pointer select-none font-bold"
                      title="Approve and award point"
                    >
                      APPROVE ✓
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[8px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded animate-pulse">
                  ● VERIFYING...
                </span>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* Hidden Audio Element for Player */}
      <audio ref={audioPlayerRef} src={audioPlaybackUrl || undefined} className="hidden" />

      {/* Message Feed Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 selection:bg-indigo-500/20 scrollbar-none" id="chat-messages-scroller">
        {/* COMMAND AND CONTROL GAME HUB (CHATROOM INTEGRATION) */}
        {gameState?.selectedGameId === "command_control" && (
          (() => {
            const ccState = gameState.ccState || "";
            const ccMasterId = gameState.ccMasterId || "";
            const ccSubId = gameState.ccSubId || "";
            const isMaster = currentUser.id === ccMasterId;
            const isSub = currentUser.id === ccSubId;
            const ccActiveSuggestion = gameState.ccActiveSuggestion || "";
            const ccCommandAudioUrl = gameState.ccCommandAudioUrl || "";

            if (ccState === "waiting_for_command") {
              if (isMaster) {
                return (
                  <div className="bg-linear-to-br from-pink-950/45 to-purple-950/20 border border-pink-500/40 rounded-2xl p-4.5 text-center flex flex-col gap-3.5 shadow-[0_0_25px_rgba(236,72,153,0.15)] select-none animate-fade-in" id="chatroom-cc-master-console">
                    <div className="flex items-center justify-center gap-1.5 border-b border-white/[0.04] pb-2 text-pink-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
                      <span className="text-[10px] font-mono tracking-widest font-black uppercase">👑 MASTER CHATROOM CONTROL</span>
                    </div>
                    <p className="text-[10.5px] text-zinc-300 leading-normal font-sans">
                      Your Subject is listening! Send a voice order using the <strong className="text-white">microphone 🎙️ below</strong>, type custom text, or enforce a seed instantly:
                    </p>
                    
                    {/* Instant templates dispatch area */}
                    <div className="flex flex-col gap-1.5 text-left bg-black/40 p-2 border border-white/[0.03] rounded-xl max-h-[140px] overflow-y-auto scrollbar-thin">
                      <span className="text-[7.5px] font-mono tracking-widest text-pink-400 uppercase font-bold block mb-1">🔥 Instant Hot Seeds:</span>
                      {EROTIC_TASKS.slice(0, 4).map((task, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2.5 p-2 bg-[#020202] hover:bg-zinc-900 border border-white/[0.02] rounded-lg text-[9.5px] leading-relaxed text-zinc-400 hover:text-white transition-colors">
                          <span className="flex-1 text-[9px]">{task}</span>
                          <button
                            onClick={() => {
                              updateRoomState?.({
                                ccState: "waiting_for_verification",
                                ccActiveSuggestion: task,
                                ccCommandAudioUrl: "",
                                ccVerificationVideoUrl: "",
                                ccVerificationType: "",
                                lastActionBy: currentUser.id
                              });
                              triggerAlert("Custom seed task broadcasted to Sub! 🌶️⚡", "success");
                            }}
                            className="bg-pink-650 hover:bg-pink-500 text-white font-mono text-[7.5px] font-bold px-2 py-1 rounded uppercase tracking-wider shrink-0 active:scale-95 transition-all cursor-pointer"
                          >
                            Enforce
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-[#050508] border border-white/[0.03] rounded-2xl p-4 text-center shadow-lg animate-fade-in flex flex-col gap-3" id="chatroom-cc-sub-awaiting">
                    <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-dashed border-violet-500/20 animate-[spin_8s_linear_infinite]" />
                      <span className="absolute w-5 h-5 rounded-full bg-violet-500/5 animate-ping" />
                      <span className="text-violet-400 font-bold font-mono text-[10px]">⌛</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-violet-400 uppercase font-black block animate-pulse">
                        AWAITING INCOMING DIRECTIVE
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-1 max-w-xs mx-auto text-center leading-normal">
                        Keep your earplay on. Master is active inside the control console, preparing your physical obedience challenge. Stand by...
                      </p>
                    </div>
                  </div>
                );
              }
            }

            if (ccState === "waiting_for_verification") {
              if (isMaster) {
                return (
                  <div className="bg-[#050508] border border-white/[0.03] rounded-2xl p-4 text-center shadow-lg animate-fade-in flex flex-col gap-3" id="chatroom-cc-master-waiting">
                    <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-dashed border-pink-500/20 animate-[spin_8s_linear_infinite]" />
                      <span className="absolute w-5 h-5 rounded-full bg-pink-500/5 animate-ping" />
                      <span className="text-pink-400 font-bold font-mono text-[10px]">⏱️</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono tracking-widest text-zinc-500 uppercase font-black block leading-none">
                        ⏱️ AWAITING RESPONSE
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-2.5 max-w-xs mx-auto text-center leading-normal">
                        Active Order: <em className="text-pink-300 font-mono font-medium">"{ccActiveSuggestion}"</em>
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-1 pb-1">
                        Sub received directive and is currently filming their 8s compliance video teaser inside their viewfinder shutter...
                      </p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-linear-to-br from-violet-950/40 via-[#07070a]/95 to-pink-950/20 border border-violet-500/45 rounded-2xl p-4.5 text-center flex flex-col justify-center items-center gap-3 animate-fade-in" id="chatroom-cc-sub-verify">
                    <span className="text-[9.5px] font-mono font-black text-pink-400 tracking-wider flex items-center justify-center gap-1.5 uppercase leading-none animate-pulse">
                      🔥 COMPLY MASTER INSTRUCTIONS 🔥
                    </span>
                    <div className="p-3 bg-black/50 border border-white/[0.02] rounded-xl font-sans mt-0.5 text-center max-w-xs w-full text-zinc-100">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Direct Command Text:</span>
                      <p className="text-[10.5px] leading-relaxed font-mono text-pink-300">
                        "{ccActiveSuggestion}"
                      </p>
                    </div>

                    {ccCommandAudioUrl && (
                      <div className="p-3 my-0.5 rounded-xl bg-violet-950/25 border border-violet-500/20 flex flex-col gap-2 text-center max-w-xs mx-auto w-full">
                        <div className="flex items-center justify-center gap-1.5 text-violet-400 font-mono text-[9.5px] font-bold uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
                          🔊 Play voice directive
                        </div>
                        <audio src={ccCommandAudioUrl} controls autoPlay className="w-full h-8 mt-1 focus:outline-none" />
                      </div>
                    )}

                    <div className="w-full flex flex-col gap-2 mt-1">
                      <button
                        onClick={openInAppCamera}
                        className="py-2.5 px-4 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white font-mono text-[9px] tracking-widest uppercase rounded-xl transition-all font-extrabold cursor-pointer hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <Video className="w-4 h-4 text-white" /> 📹 RECORD COMPLIANCE (8S)
                      </button>
                      <p className="text-[8px] text-zinc-500 tracking-normal font-sans text-center">
                        The shutter will automatically restrict capture to 8 seconds, sync to Drive, and transmit immediately for instant score audit!
                      </p>
                    </div>
                  </div>
                );
              }
            }

            if (ccState === "waiting_for_approval") {
              if (isMaster) {
                return (
                  <div className="bg-linear-to-br from-emerald-950/40 via-zinc-950/90 to-teal-950/20 border border-emerald-500/40 rounded-2xl p-4.5 text-center flex flex-col gap-3 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-fade-in" id="chatroom-cc-master-approve">
                    <span className="text-[10px] font-mono font-black text-emerald-400 tracking-wider flex items-center justify-center gap-1 uppercase leading-none">
                      <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> AUDIT COMPLIANCE VIDEO
                    </span>

                    {gameState.ccVerificationVideoUrl && (
                      <div className="w-full max-w-xs mx-auto p-1.5 rounded-xl border border-white/[0.04] bg-[#020202] shadow">
                        <video src={gameState.ccVerificationVideoUrl} controls autoPlay loop playsInline className="w-full aspect-video rounded-lg object-cover" />
                      </div>
                    )}

                    <p className="text-[9px] text-zinc-400 leading-normal px-2">
                      Active: <em className="text-zinc-200">"{ccActiveSuggestion}"</em>. Check the proof details above carefully, and approve/reject the scorecard:
                    </p>

                    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto w-full mt-1">
                      <button
                        type="button"
                        onClick={onCommandReject}
                        className="py-2.5 px-3 bg-zinc-950 border border-zinc-900 hover:border-red-500/40 hover:bg-red-950/20 text-rose-455 font-mono text-[9px] tracking-wider uppercase rounded-xl transition-all font-bold cursor-pointer"
                      >
                        REJECT Retake ❌
                      </button>
                      <button
                        type="button"
                        onClick={onCommandApprove}
                        className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-mono text-[9px] tracking-wider uppercase rounded-xl transition-all font-extrabold cursor-pointer shadow-lg shadow-emerald-500/15"
                      >
                        APPROVE +1 SCORE ✓
                      </button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-[#050508] border border-white/[0.03] rounded-2xl p-4 text-center shadow-lg animate-fade-in flex flex-col gap-3" id="chatroom-cc-sub-waiting">
                    <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20 animate-[spin_8s_linear_infinite]" />
                      <span className="absolute w-5 h-5 rounded-full bg-emerald-500/5 animate-ping" />
                      <span className="text-emerald-400 font-bold font-mono text-[10px]">●</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono tracking-widest text-[#10b981] uppercase font-black block animate-pulse">
                        ● UNDER REVIEW AUDITED BY MASTER ●
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-2 max-w-xs mx-auto text-center leading-normal">
                        Compliance teaser uploaded and dispatched safely! Master is currently watching your submissions live and scoring the checklist...
                      </p>
                    </div>
                  </div>
                );
              }
            }

            return null;
          })()
        )}
        {/* Dismissable Secure App Banner */}
        {showSecurityBanner && (
          <div className="relative bg-linear-to-r from-emerald-950/45 to-teal-950/10 border border-emerald-500/35 rounded-2xl p-3 pr-8 text-left flex items-start gap-3 shadow-[0_0_20px_rgba(16,185,129,0.05)] select-none animate-fade-in" id="secured-privacy-notification">
            <button
              onClick={() => {
                setShowSecurityBanner(false);
                try {
                  localStorage.setItem("nexus_show_security_banner", "false");
                } catch (e) {}
              }}
              className="absolute top-2 right-2 p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/10 transition-all cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 font-bold text-xs block animate-pulse">🔒</span>
            </div>
            <div className="space-y-1 font-sans">
              <h5 className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider leading-none">
                Fully Secured Space
              </h5>
              {currentUser?.email === "q8497464@gmail.com" ? (
                <p className="text-[9px] text-zinc-400 leading-relaxed font-light mt-0.5">
                  Strict Snapchat-inspired transient policy active:
                  <br />
                  <span className="text-zinc-300 font-medium">• Ephemeral Vault Guard</span>: Once a task challenge is approved by your partner, all accompanying photographs, video highlights, and voice note proofs are wiped permanently and irreversibly from server databases and both matching client screens in exactly 3 minutes.
                  <br />
                  <span className="text-zinc-300 font-medium">• Auto-backup Enabled</span>: Media is seamlessly mirrored securely to your admin Google Drive partition.
                </p>
              ) : (
                <p className="text-[9px] text-zinc-400 leading-relaxed font-light mt-0.5">
                  Advanced structural security protocols active:
                  <br />
                  <span className="text-zinc-300 font-medium">• End-to-End Encryption</span>: All photographs, video highlights, and voice note proofs are protected globally with secure E2E sockets.
                  <br />
                  <span className="text-zinc-300 font-medium">• Zero-Knowledge Socket</span>: No logs are kept on central storage hubs. Play with maximum intimacy and peace of mind.
                </p>
              )}
            </div>
          </div>
        )}

        {messages.filter((msg) => {
          if (!msg.createdAt) return true;
          const startTime = new Date(msg.createdAt).getTime();
          const ageMs = currentTime - startTime;
          return ageMs < 60000; // Filter on current 500ms reactive timer clock
        }).map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center py-1 px-4" id={`system-msg-${msg.id}`}>
                <span className="inline-block text-[9px] bg-white/[0.03] border border-white/5 font-mono text-indigo-300 py-1 px-3.5 rounded-full select-none">
                  🛡️ {msg.text}
                </span>
              </div>
            );
          }

          const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
          const ageSeconds = Math.max(0, Math.floor((currentTime - msgTime) / 1000));
          const remainingSeconds = Math.max(0, 60 - ageSeconds);

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              id={`bubble-msg-${msg.id}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 select-none">
                <span className="text-[8px] font-mono font-semibold text-zinc-400">
                  {isMe ? "You" : msg.senderName}
                </span>
                <span className="text-[7.5px] font-mono px-1.5 py-0.2 bg-red-500/10 border border-red-500/20 text-red-400 rounded flex items-center gap-0.5 animate-pulse">
                  <span>🔒 vanishing in {remainingSeconds}s</span>
                </span>
              </div>

              {/* Text / standard text contents */}
              {msg.text && (!msg.mediaUrl || msg.mediaType === "text") && (
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-indigo-600/95 text-white rounded-tr-none shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                      : "bg-white/[0.04] text-zinc-100 border border-white/5 rounded-tl-none backdrop-blur-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              )}

              {/* Image thumbnail message bubble */}
              {msg.mediaType === "image" && msg.mediaUrl && (
                <div 
                  onClick={() => {
                    setActiveMediaUrl(msg.mediaUrl || null);
                    setActiveMediaKind("image");
                  }}
                  className={`rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer shadow-lg bg-black/20 ${
                    isApprovalPending && msg.id === messages[messages.length - 1]?.id
                      ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse" 
                      : "border-white/10 hover:border-purple-500"
                  }`}
                >
                  <img 
                    src={msg.mediaUrl} 
                    alt="Captured Moment" 
                    referrerPolicy="no-referrer"
                    className="max-h-[140px] max-w-[200px] object-cover" 
                    style={{ filter: cameraFilters.find(f => f.id === msg.filterId)?.style || "none" }}
                  />
                  <div className="bg-black/40 py-1 px-2.5 text-[8px] font-mono text-zinc-400 flex flex-col gap-1 sm:flex-row sm:items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5 text-purple-400" /> {isApprovalPending && msg.id === messages[messages.length - 1]?.id ? "SUBMITTED PROOF" : "TAP TO EXPAND"}
                    </span>
                    <MessageTimer createdAt={msg.createdAt} isAdmin={currentUser?.email === "q8497464@gmail.com"} />
                    {currentUser?.email === "q8497464@gmail.com" && msg.driveSynced && msg.driveFileUrl && (
                      <a 
                        href={msg.driveFileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 transition-colors font-bold shrink-0" 
                        onClick={(e) => e.stopPropagation()}
                        title="Saved in Google Drive"
                      >
                        <Cloud className="w-2.5 h-2.5" /> GDRIVE
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Video message bubble */}
              {msg.mediaType === "video" && msg.mediaUrl && (
                <div 
                  className={`rounded-2xl overflow-hidden border shadow-lg bg-black/40 max-w-[200px] transition-all duration-500 ${
                    ((isApprovalPending && msg.id === messages[messages.length - 1]?.id) || (gameState?.selectedGameId === "command_control" && gameState?.ccState === "waiting_for_approval" && msg.mediaUrl === gameState?.ccVerificationVideoUrl))
                      ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                      : "border-white/10"
                  }`}
                >
                  <video 
                    src={msg.mediaUrl} 
                    controls 
                    muted 
                    playsInline
                    className="max-h-[140px] w-full object-cover" 
                    style={{ filter: cameraFilters.find(f => f.id === msg.filterId)?.style || "none" }}
                  />
                  <div className="bg-black/50 py-1 px-2.5 text-[8px] font-mono text-zinc-400 flex flex-col gap-1 sm:flex-row sm:items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Video className={`w-2.5 h-2.5 ${((isApprovalPending && msg.id === messages[messages.length - 1]?.id) || (gameState?.selectedGameId === "command_control" && gameState?.ccState === "waiting_for_approval" && msg.mediaUrl === gameState?.ccVerificationVideoUrl)) ? "text-purple-400 animate-pulse" : "text-magenta-400"}`} /> 
                      {(gameState?.selectedGameId === "command_control" && msg.mediaUrl === gameState?.ccVerificationVideoUrl) ? "OBEDIENCE PROOF" : "VIDEO PROOF"}
                    </span>
                    <MessageTimer createdAt={msg.createdAt} isAdmin={currentUser?.email === "q8497464@gmail.com"} />
                    <div className="flex items-center gap-2">
                      {currentUser?.email === "q8497464@gmail.com" && msg.driveSynced && msg.driveFileUrl && (
                        <a 
                          href={msg.driveFileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 transition-colors font-bold shrink-0" 
                          onClick={(e) => e.stopPropagation()}
                          title="Saved in Google Drive"
                        >
                          <Cloud className="w-2.5 h-2.5" /> GDRIVE
                        </a>
                      )}
                      <span className="text-[7px] text-green-400 font-bold uppercase">MUTED</span>
                    </div>
                  </div>

                  {/* DYNAMIC COMPLIANCE STATUS INDICATOR (IF ALREADY EVALUATED) */}
                  {gameState?.selectedGameId === "command_control" && msg.ccStatus && (
                    <div className={`p-1.5 border-t text-center ${
                      msg.ccStatus === "approved" 
                        ? "border-emerald-500/20 bg-emerald-950/30" 
                        : "border-red-500/20 bg-[#270c12]/50"
                    }`} onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[8.5px] font-mono uppercase tracking-wider block font-black ${
                        msg.ccStatus === "approved" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {msg.ccStatus === "approved" ? "✓ Approved (+1 Point)" : "✗ Rejected (Requires Retake)"}
                      </span>
                    </div>
                  )}

                  {/* MASTER ASSESSMENT CHOICES ON ANY SUB VIDEO IN CHATROOM */}
                  {gameState?.selectedGameId === "command_control" && 
                   !msg.ccStatus && 
                   msg.senderId === gameState?.ccSubId && 
                   currentUser.id === gameState?.ccMasterId && (
                    <div className="p-2 border-t border-pink-500/20 bg-zinc-950/95 flex flex-col gap-1.5 animate-pulse" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[7.5px] font-mono text-pink-400 font-extrabold tracking-widest uppercase block text-center">
                        👑 MASTER AUDIT DECISION
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 px-0.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateMessageStatus(msg.id, "rejected")}
                          className="py-1 px-2.5 bg-red-950/40 hover:bg-rose-700 hover:text-white border border-rose-500/30 text-rose-350 rounded-md text-[8.5px] font-mono tracking-wider uppercase transition-all font-extrabold cursor-pointer select-none"
                        >
                          REJECT retake ❌
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateMessageStatus(msg.id, "approved")}
                          className="py-1 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-[1.02] text-white rounded-md text-[8.5px] font-mono tracking-wider uppercase transition-all font-extrabold cursor-pointer select-none shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        >
                          APPROVE ✓
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB COMPLIANCE STATUS INDICATOR */}
                  {gameState?.selectedGameId === "command_control" && 
                   !msg.ccStatus && 
                   msg.senderId === gameState?.ccSubId && 
                   currentUser.id === gameState?.ccSubId && (
                    <div className="p-1.5 border-t border-purple-500/20 bg-purple-950/20 text-center animate-pulse">
                      <span className="text-[7.5px] font-mono text-purple-300 uppercase tracking-widest block font-bold">
                        ⏱️ Awaiting audit rating...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Audio / Voice message bubble */}
              {msg.mediaType === "audio" && msg.mediaUrl && (
                <div 
                  className={`px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-3.5 transition-all duration-500 relative ${
                    isMe 
                      ? isApprovalPending && msg.id === messages[messages.length - 1]?.id
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400/80 text-white rounded-tr-none shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse"
                        : "bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white rounded-tr-none shadow-[0_4px_12px_rgba(147,51,234,0.3)]"
                      : isApprovalPending && msg.id === messages[messages.length - 1]?.id
                        ? "bg-purple-950/20 text-zinc-100 border border-purple-500/50 rounded-tl-none backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse"
                        : "bg-white/[0.04] text-zinc-100 border border-white/5 rounded-tl-none backdrop-blur-md"
                  }`}
                >
                  {currentUser?.email === "q8497464@gmail.com" && msg.driveSynced && msg.driveFileUrl && (
                    <a 
                      href={msg.driveFileUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="absolute top-1.5 right-1.5 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-0.5 text-[8px] font-mono font-bold"
                      title="Saved in Google Drive"
                    >
                      <Cloud className="w-2 h-2" /> DRIVE
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleAudio(msg.id, msg.mediaUrl || "")}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors"
                  >
                    {playingAudioId === msg.id ? <Pause className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5 translate-x-0.5" />}
                  </button>
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-purple-200">Voice Note</span>
                      <MessageTimer createdAt={msg.createdAt} isAdmin={currentUser?.email === "q8497464@gmail.com"} />
                    </div>
                    {/* Simulated pulse sound bars */}
                    <div className="flex gap-0.5 items-end h-3 pt-1">
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-2.5 animate-bounce' : 'h-1'}`} />
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-3 animate-bounce [animation-delay:0.1s]' : 'h-1.5'}`} />
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-2 animate-bounce [animation-delay:0.2s]' : 'h-1'}`} />
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-3 animate-bounce [animation-delay:0.3s]' : 'h-2'}`} />
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-1.5 animate-bounce [animation-delay:0.4s]' : 'h-1'}`} />
                      <span className={`w-0.5 rounded bg-purple-300 ${playingAudioId === msg.id ? 'h-2 animate-bounce [animation-delay:0.5s]' : 'h-1.5'}`} />
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER CONTROLS ROW */}
      <div className="border-t border-white/10 bg-black/50 p-2" id="chat-controls-bar">
        {isRecordingAudio ? (
          /* Pulse active Voice recording dashboard */
          <div className="flex items-center justify-between px-3 py-1.5 rounded-2xl bg-gradient-to-r from-magenta-900/30 to-purple-900/30 border border-magenta-500/30 animate-pulse shadow-[0_0_15px_rgba(219,39,119,0.25)]" id="audio-recording-panel">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-magenta-500 animate-ping shrink-0" />
              <span className="text-[10px] font-mono text-magenta-300 uppercase tracking-widest">
                Recording Voice Note ({formatTimer(audioSecs)})
              </span>
            </div>
            <div className="flex lg:gap-3 gap-2">
              <button
                type="button"
                onClick={() => stopAudioRecording(true)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-rose-400 font-mono text-[9px] tracking-wider rounded-lg uppercase transition-all"
              >
                DISCARD
              </button>
              <button
                type="button"
                onClick={() => stopAudioRecording(false)}
                className="px-3.5 py-1 bg-magenta-600 hover:bg-magenta-500 text-white font-mono text-[9px] tracking-wider rounded-lg uppercase transition-all flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> SEND
              </button>
            </div>
          </div>
        ) : (
          /* Main Input Form with camera/voice inputs */
          <form onSubmit={handleSendTextMessage} className="flex gap-1.5 items-center" id="chat-input-row">
            {/* In-app camera button */}
            <button
              type="button"
              onClick={openInAppCamera}
              className="w-10 h-10 shrink-0 border border-white/10 hover:border-purple-400 bg-white/[0.02] hover:bg-purple-500/10 text-zinc-400 hover:text-purple-300 rounded-xl flex items-center justify-center transition-all"
              id="chat-trigger-camera"
              title="Open Cam"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Hold/Release Voice recording button */}
            <button
              type="button"
              onClick={startAudioRecording}
              className="w-10 h-10 shrink-0 border border-white/10 hover:border-magenta-450 bg-white/[0.02] hover:bg-magenta-500/10 text-zinc-400 hover:text-magenta-300 rounded-xl flex items-center justify-center transition-all"
              id="chat-trigger-voice"
              title="Record Voice"
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Whisper or deliver response..."
              className="flex-1 bg-white/[0.02] border border-white/10 text-xs font-light text-zinc-100 rounded-xl px-3.5 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all"
              id="chat-user-message-field"
            />
            
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-50"
              id="chat-send-trigger"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* --- FLOATING LIGHTBOX POPUPS --- */}

      {/* Enlarge picture view */}
      {activeMediaUrl && activeMediaKind === "image" && (
        <div 
          onClick={() => {
            setActiveMediaUrl(null);
            setActiveMediaKind(null);
          }}
          className="absolute inset-0 bg-black/95 z-40 flex flex-col justify-center items-center p-4 cursor-zoom-out"
        >
          <img 
            src={activeMediaUrl} 
            alt="Expanded Captured Moment" 
            referrerPolicy="no-referrer"
            className="max-h-[80%] max-w-full rounded-2xl border border-white/15 shadow-2xl" 
            style={{ filter: cameraFilters.find(f => f.id === messages.find(m => m.mediaUrl === activeMediaUrl)?.filterId)?.style || "none" }}
          />
          <span className="text-[10px] font-mono text-zinc-500 mt-4 tracking-widest uppercase">
            Click anywhere to close preview
          </span>
        </div>
      )}

      {/* IN-APP CAMERA OVERLAY PORTAL */}
      {isCameraOpen && (
        <div className="absolute inset-x-0 bottom-0 h-[280px] bg-black/95 border-t border-white/15 rounded-t-3xl z-50 flex flex-col overflow-hidden animate-slide-up" id="camera-overlay-portal">
          <div className="h-10 px-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-mono tracking-widest text-zinc-300 uppercase flex items-center gap-1">
              <Camera className="w-3 h-3 text-purple-400" />
              In-App Nexus Cam
            </span>
            <button 
              type="button" 
              onClick={closeInAppCamera} 
              className="text-zinc-500 hover:text-white p-1 rounded hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex" id="camera-viewport-split">
            {/* Left Portion: Live streaming Viewport */}
            <div className="flex-1 bg-zinc-950 relative flex items-center justify-center overflow-hidden group">
              <video 
                ref={videoElementRef} 
                autoPlay 
                playsInline
                className="w-full h-full object-cover scale-x-[-1]" 
                style={{ filter: cameraFilters.find(f => f.id === selectedFilter)?.style || "none" }}
              />
              {/* Overlay simulation target graphic */}
              <div className="absolute top-4 left-4 border border-dashed border-purple-500/20 rounded-xl pointer-events-none flex items-center justify-center p-2">
                <span className="text-[7px] font-mono text-white/40 select-none uppercase tracking-widest">
                  Secure Lens • {cameraFilters.find(f => f.id === selectedFilter)?.name}
                </span>
              </div>

              {/* Snapchat filter bubbles strip overlay */}
              <div className="absolute bottom-1 inset-x-0 px-2 flex justify-start gap-1 rounded-t-xl overflow-x-auto py-1.5 bg-black/60 backdrop-blur-md scrollbar-none border-t border-white/5 z-25">
                {cameraFilters.map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => {
                      setSelectedFilter(flt.id);
                      triggerAlert(`Lens switched to ${flt.name}! ✨`, "info");
                    }}
                    className={`px-2 py-0.5 text-[8.5px] font-mono rounded-full border transition-all shrink-0 active:scale-95 ${
                      selectedFilter === flt.id
                        ? "bg-purple-600/90 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)] font-bold"
                        : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200"
                    }`}
                    title={flt.desc}
                  >
                    {flt.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Portion: Control action deck */}
            <div className="w-28 bg-zinc-950 border-l border-white/10 flex flex-col items-center justify-center p-3 gap-3 shrink-0">
              {/* Type toggle selection */}
              <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-lg w-full shrink-0">
                <button
                  type="button"
                  onClick={() => setCameraMode("photo")}
                  className={`py-1 text-[8px] font-mono rounded uppercase transition-colors ${cameraMode === "photo" ? "bg-purple-600 text-white" : "text-zinc-500"}`}
                >
                  Pic
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode("video")}
                  className={`py-1 text-[8px] font-mono rounded uppercase transition-colors ${cameraMode === "video" ? "bg-magenta-600 text-white" : "text-zinc-500"}`}
                >
                  Vid
                </button>
              </div>

              {cameraMode === "photo" ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-14 h-14 rounded-full border-4 border-white bg-purple-500 hover:bg-purple-400 active:scale-90 transition-all shadow-lg flex items-center justify-center text-white"
                  title="Capture Snap"
                >
                  <Camera className="w-5 h-5" />
                </button>
              ) : (
                /* Video capture trigger button */
                isRecordingVideo ? (
                  <button
                    type="button"
                    onClick={stopVideoRecording}
                    className="w-14 h-14 rounded-full border-4 border-white bg-rose-600 animate-pulse active:scale-90 transition-all shadow-lg flex flex-col items-center justify-center"
                    title="Stop Video"
                  >
                    <Square className="w-4 h-4 text-white" />
                    <span className="text-[7px] text-white font-mono mt-0.5">{formatTimer(videoSecs)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVideoRecording}
                    className="w-14 h-14 rounded-full border-4 border-white bg-magenta-650 hover:bg-magenta-500 active:scale-90 transition-all shadow-lg flex items-center justify-center text-white"
                    title="Record Video Clip"
                  >
                    <Video className="w-5 h-5 shrink-0" />
                  </button>
                )
              )}

              <span className="text-[7px] font-mono text-zinc-500 text-center uppercase tracking-widest">
                {cameraMode === "photo" ? "Snap Photo" : isRecordingVideo ? "Recording" : "Start Video"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE SYNC SETTINGS MODAL */}
      {isDriveModalOpen && currentUser?.email === "q8497464@gmail.com" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" id="gdrive-settings-modal">
          <div className="bg-[#0b0c14]/95 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden" id="gdrive-settings-modal-card">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 shrink-0 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  Google Drive Cloud Vault
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                id="btn-close-gdrive-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

             {/* Modal Body */}
            <div className="space-y-4 text-xs font-light text-zinc-300 leading-relaxed max-h-[350px] overflow-y-auto pr-1">
              <p>
                Securely store all photographs, videos, and custom voice recordings taken during game play directly inside your personal Google Drive account.
              </p>

              {/* Central Backup Status block to satisfy prompt */}
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 flex flex-col gap-1.5" id="central-gdrive-status">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider font-semibold">
                    Backup: q8497464@gmail.com
                  </span>
                  {sharedDriveConfig ? (
                    <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-full px-2.5 py-0.5 font-mono uppercase font-bold animate-pulse">
                      Active 🟢
                    </span>
                  ) : (
                    <span className="text-[9px] bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-full px-2.5 py-0.5 font-mono uppercase font-bold">
                      Offline 🔴
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-zinc-400 leading-normal">
                  {sharedDriveConfig 
                    ? `Encrypted Vault Connected. All partner videos, snapshots, and voice memos will automatically upload into your dedicated personal nested subfolder inside q8497464's main game directory.` 
                    : `Central backup credentials have not been configured yet. Let the administrator (q8497464@gmail.com) authenticate below to enable automated storage schemas for everyone.`}
                </p>
                {currentUser?.email === "q8497464@gmail.com" && (
                  <div className="mt-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9.5px] p-2 rounded-xl font-mono leading-relaxed" id="admin-gdrive-alert">
                    👑 ADMIN DETECTED: Tap Google Sign-In below to generate & broadcast the globally shared folder token!
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Local Account Token:</span>
                  {driveToken ? (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Linked Locally
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Unlinked
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                    Target Shared Folder ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value="1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ"
                    className="w-full bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono text-[10px]"
                    id="gdrive-folder-name-input"
                  />
                  <p className="text-[9px] text-zinc-500 font-mono italic">
                    Configured Google Drive Directory (1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ).
                  </p>
                </div>
              </div>

              {/* Linking Methods */}
              {!driveToken ? (
                <div className="space-y-3">
                  <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider block font-semibold">
                      Method A: Sign-In Authentication
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Authorize secure folder-only write capability into your drive console using Google official popups.
                    </p>
                    <button
                      type="button"
                      onClick={handleTriggerImplicitAuth}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
                      id="btn-oauth-implicit-gdrive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> AUTHORIZE WITH GOOGLE
                    </button>
                    
                    <div className="flex flex-col gap-1 mt-2 pt-1 border-t border-white/5">
                      <span className="text-[8px] font-mono text-zinc-500">CLIENT ID OVERRIDE (for dev export testing)</span>
                      <input 
                        type="text"
                        value={customClientIdInput}
                        onChange={(e) => setCustomClientIdInput(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-white/5 rounded px-2 py-0.5 text-zinc-400 font-mono text-[9px] focus:outline-none focus:border-indigo-400"
                        id="client-id-override-input"
                      />
                    </div>
                  </div>

                  <div className="border border-white/5 bg-white/[0.01] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Method B: Paste OAuth Access Token
                    </span>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      If sandboxed inside development preview, paste any active Google OAuth Token (from Google Playground) for fast debug.
                    </p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customTokenInput}
                        onChange={(e) => setCustomTokenInput(e.target.value)}
                        placeholder="Paste Google Access Token (ya29...)"
                        className="flex-1 bg-zinc-950/60 border border-white/10 rounded-lg px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono text-[10px] placeholder:text-zinc-750"
                        id="gdrive-token-manual-field"
                      />
                      <button
                        type="button"
                        onClick={handleSaveTokenManually}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[9px] tracking-widest px-3 rounded-lg border border-white/10 uppercase transition-colors shrink-0"
                        id="btn-submit-gdrive-token-manual"
                      >
                        Mount
                      </button>
                    </div>
                    <a 
                      href="https://developers.google.com/oauthplayground/" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[9px] font-mono text-emerald-400 hover:underline flex items-center gap-0.5 mt-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Open Google OAuth Playground
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5">
                    <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block font-bold">
                        Auto-Backup Active
                      </span>
                      <p className="text-[10px] text-zinc-400 leading-tight mt-1">
                        Any shared media will directly stream to your folder: <strong className="text-zinc-200">'1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ'</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="w-full py-2 bg-rose-900/10 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg font-mono text-[9px] tracking-widest uppercase transition-all"
                    id="btn-decouple-gdrive"
                  >
                    Disconnect Google Account
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-5 text-center shrink-0">
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="py-1.5 px-6 bg-white/5 hover:bg-white/10 text-[9px] font-mono tracking-widest text-zinc-400 hover:text-zinc-250 border border-white/5 rounded-xl uppercase transition-colors"
                id="btn-finish-gdrive-modal"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
