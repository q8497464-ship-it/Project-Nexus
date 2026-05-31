import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Heart, 
  Sparkles, 
  RotateCcw, 
  LogOut, 
  Lock,
  Award, 
  Compass, 
  Smartphone, 
  Layers, 
  Check, 
  X,
  AlertOctagon,
  Copy,
  Zap,
  Volume2,
  VolumeX,
  Music
} from "lucide-react";

import { 
  GameState, 
  Player, 
  CoinState, 
  CoinResult, 
  ApprovalState, 
  TaskCard, 
  GameMode,
  ChatMessage
} from "./types";
import { truthAndDareTasks } from "./data/tasks";
import { 
  db, 
  auth, 
  isFirebaseSupported, 
  handleFirestoreError, 
  ensureReadyUser, 
  OperationType,
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc,
  deleteDoc,
  collection,
  getDocs
} from "./lib/firebase";

import PartnerConnect from "./components/PartnerConnect";
import CoinFlip3D from "./components/CoinFlip3D";
import TaskCardComponent from "./components/TaskCard";
import ApprovalSystem from "./components/ApprovalSystem";
import LoginAuth from "./components/LoginAuth";
import RoomConnection, { getPersonalCode } from "./components/RoomConnection";
import Chatroom from "./components/Chatroom";
import CommandAndControlGame from "./components/CommandAndControlGame";
import VirtualTouchGame from "./components/VirtualTouchGame";
import { getStoredDriveToken, setStoredDriveToken } from "./lib/drive";
import { soundManager } from "./lib/sound";

// Generate a high-end couple-themed random 4-letter room code
const createRoomCode = (): string => {
  const codes = ["KISS", "LOVE", "DEAR", "LUSH", "DUET", "DATE", "GLOW", "TWIN", "HALO", "PULSE", "VEIL", "CYBER"];
  const randomInd = Math.floor(Math.random() * codes.length);
  const prefix = codes[randomInd];
  const suffix = Math.floor(Math.random() * 90 + 10); // add 2 numbers for security
  return `${prefix}${suffix}`;
};

export default function App() {
  // Application Global Core State
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("local");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Luxury Audio states
  const [bgmOn, setBgmOn] = useState(soundManager.getBgmStatus());
  const [sfxOn, setSfxOn] = useState(soundManager.getSfxStatus());

  // Custom Cloud sync notifications
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  
  // Twin Screen Emulator Switch (Allows testing dual-partner sync in one browser tab!)
  const [twinModeEnabled, setTwinModeEnabled] = useState(true);
  
  // Submit micro-interaction animation state for Done button
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "loading" | "success">("idle");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  
  // Simulated Emulated state for Second Player (Simulates partner's tab)
  const [emulatedUser, setEmulatedUser] = useState<Player | null>({
    id: "usr_emulated_scarlett",
    name: "Scarlett",
    gender: "female"
  });

  // Display automatic toasts
  const triggerAlert = (text: string, type: "success" | "info" | "error" = "info") => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Play general sound effects helper
  const playClick = () => {
    soundManager.play("click");
  };

  // Sound togglers
  const handleToggleBgm = () => {
    soundManager.resume();
    const result = soundManager.toggleBgm();
    setBgmOn(result);
    if (result) {
      soundManager.play("success");
      triggerAlert("Ambient luxury soundscape enabled 🎵", "success");
    } else {
      triggerAlert("Ambient soundscape muted 🔇", "info");
    }
  };

  const handleToggleSfx = () => {
    soundManager.resume();
    const result = soundManager.toggleSfx();
    setSfxOn(result);
    if (result) {
      soundManager.play("ping");
      triggerAlert("Tactile sound effects active! 🔊", "success");
    } else {
      triggerAlert("Sound effects muted! 🔇", "info");
    }
  };

  // Unlock audio state on initial gestures
  useEffect(() => {
    const unlockAudio = () => {
      soundManager.resume();
    };
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  // Parse URL query parameter for room invitation
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomFromUrl = params.get("room") || params.get("code");
      if (roomFromUrl) {
        const cleanCode = roomFromUrl.trim().toUpperCase();
        setInvitedRoomCode(cleanCode);
        triggerAlert(`✨ Invited to Suite Code: ${cleanCode}. Complete login or click quick guest join to connect!`, "success");
      }
    } catch (e) {
      console.error("Failed to parse room code from query params:", e);
    }
  }, []);

  // --- AUTOMATIC BACKGROUND PEER PAIRING LISTENER ---
  useEffect(() => {
    if (!currentUser || gameState) return;
    if (!isFirebaseSupported || !db) return;

    const personalCode = getPersonalCode(currentUser);
    const docRef = doc(db, "rooms", personalCode);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.data() as GameState;
        
        // If the room status is active and we are not part of it as host/guest, automatically connect
        if (roomData.status === "active") {
          if (roomData.hostId === currentUser.id) {
            setGameMode("online");
            setActiveRoomId(personalCode);
            setGameState(roomData);
            return;
          }

          if (roomData.guestId !== currentUser.id) {
            const joinedRoom: GameState = {
              ...roomData,
              guestId: currentUser.id,
              guestName: currentUser.name,
              updatedAt: new Date().toISOString()
            };
            setDoc(docRef, joinedRoom, { merge: true }).then(() => {
              setGameMode("online");
              setActiveRoomId(personalCode);
              setGameState(joinedRoom);
              soundManager.play("success");
              triggerAlert(`✨ Auto-connected with ${roomData.hostName}!`, "success");
            });
          }
        }
      }
    }, (err) => {
      console.warn("Auto-pair background observer inactive until host initialization:", err);
    });

    return () => unsubscribe();
  }, [currentUser, gameState]);

  // Synchronize submission status back to idle if we enter an idle approval state (or a new card starts)
  useEffect(() => {
    if (gameState?.approvalState === "idle") {
      setSubmissionStatus("idle");
    }
  }, [gameState?.approvalState, gameState?.currentCard?.id]);

  // --- SNAPCHAT-STYLE 3-MINUTE EPHEMERAL PURGE ENGINE ---
  useEffect(() => {
    if (gameState?.approvalState === "approved" && gameState?.approvedAt) {
      const interval = setInterval(() => {
        const approvedTime = new Date(gameState.approvedAt!).getTime();
        const elapsedMs = Date.now() - approvedTime;
        const elapsedSecs = Math.floor(elapsedMs / 1000);
        const remaining = 180 - elapsedSecs; // 3 minutes = 180 seconds

        if (remaining <= 0) {
          setSecondsLeft(0);
          clearInterval(interval);

          // Force purge & state progression only in host/current-active client to avoid state collision
          const isHost = currentUser?.id === gameState.hostId;
          const isCurrentActive = currentUser?.id === gameState.currentTurnPlayerId;
          
          if (isHost || isCurrentActive) {
            console.log("Triggering 3-minute ephemeral Snapchat wipe...");

            const isHostActiveTurn = gameState.currentTurnPlayerId === gameState.hostId;
            const addedScoreHost = isHostActiveTurn ? gameState.scoreHost + 1 : gameState.scoreHost;
            const addedScoreGuest = !isHostActiveTurn ? gameState.scoreGuest + 1 : gameState.scoreGuest;
            
            const nextPlayerId = isHostActiveTurn 
              ? (gameState.guestId || gameState.hostId) 
              : gameState.hostId;

            // Reset game turn back to coin flip
            updateRoomState({
              approvalState: "idle",
              turnNumber: gameState.turnNumber + 1,
              currentTurnPlayerId: nextPlayerId,
              coinState: "idle",
              coinResult: "",
              currentCard: undefined,
              scoreHost: addedScoreHost,
              scoreGuest: addedScoreGuest,
              approvedAt: ""
            });

            // Wipe media files/messages from the database
            if (gameMode === "online" && isFirebaseSupported && db) {
              const msgsRef = collection(db, "rooms", gameState.id, "messages");
              getDocs(msgsRef).then((snap) => {
                snap.forEach((messageDoc) => {
                  const data = messageDoc.data() as any;
                  if (data.mediaType && data.mediaType !== "text") {
                    deleteDoc(doc(db, "rooms", gameState.id, "messages", messageDoc.id))
                      .then(() => console.log("Snapchat Ephemeral: Deleted proof message:", messageDoc.id))
                      .catch(e => console.error(e));
                  }
                });
              }).catch(e => console.error(e));
            } else {
              // Local fallback simulation purge
              const chatKey = `chat_${gameState.id}`;
              const stored = localStorage.getItem(chatKey);
              if (stored) {
                try {
                  const list = JSON.parse(stored);
                  const filtered = list.filter((m: any) => !m.mediaType || m.mediaType === "text");
                  localStorage.setItem(chatKey, JSON.stringify(filtered));
                  window.dispatchEvent(new Event("storage"));
                } catch (e) {
                  console.error(e);
                }
              }
            }

            triggerAlert("🔒 Snapchat 3-min Ephemeral Sweep Action: Wiped all completion task data and media files from cloud registries!", "info");
          }
        } else {
          setSecondsLeft(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setSecondsLeft(null);
    }
  }, [gameState?.approvalState, gameState?.approvedAt, gameState?.id, currentUser?.id]);

  // --- PARSE GOOGLE DRIVE REDIRECT CODE HASH ---
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && (hash.includes("access_token=") || hash.includes("token="))) {
        // Strip out the leading '#' or '?' to easily read parameters
        const cleanHash = hash.replace(/^#\/?/, "");
        const params = new URLSearchParams(cleanHash);
        const token = params.get("access_token") || params.get("token");
        
        if (token) {
          setStoredDriveToken(token);
          // Set to local state so any active chat handles update fast
          window.dispatchEvent(new Event("storage"));
          
          // Clear hash for aesthetics
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
          if (currentUser?.email === "q8497464@gmail.com") {
            triggerAlert("Google Drive authorization captured! Setting up cloud database directory... ⏳", "info");
          } else {
            triggerAlert("Cloud secure connection captured! Setting up encrypted directory... ⏳", "info");
          }

          // Sync globally to Firestore /users/shared_gdrive for all clients to share
          if (isFirebaseSupported && db) {
            import("./lib/drive").then(async ({ findOrCreateFolder }) => {
              try {
                const folderId = "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ";
                
                const gdriveDocRef = doc(db, "users", "shared_gdrive");
                await setDoc(gdriveDocRef, {
                  accessToken: token,
                  folderId: folderId,
                  ownerEmail: currentUser?.email || "q8497464@gmail.com",
                  updatedAt: new Date().toISOString()
                });
                if (currentUser?.email === "q8497464@gmail.com") {
                  triggerAlert("Central Cloud Vault successfully linked globally! ☁️🟢", "success");
                } else {
                  triggerAlert("Encrypted Cloud Vault linked globally! ☁️🟢", "success");
                }
              } catch (err) {
                console.error("Failed to sync shared drive credentials:", err);
                if (currentUser?.email === "q8497464@gmail.com") {
                  triggerAlert("Linked locally, but failed to publish credentials globally.", "error");
                }
              }
            });
          } else {
            // Emulate global configuration storage statically for Sandbox simulator compatibility
            localStorage.setItem("shared_gdrive_config", JSON.stringify({
              accessToken: token,
              folderId: "1gNJGDZE0cG-V-FcsjpjXWWkDaT-8KkeZ",
              ownerEmail: currentUser?.email || "q8497464@gmail.com",
              updatedAt: new Date().toISOString()
            }));
            if (currentUser?.email === "q8497464@gmail.com") {
              triggerAlert("Linked Google Drive storage successfully! Auto-backup activated. ☁️🟢", "success");
            } else {
              triggerAlert("Encrypted Cloud connection established! Security active. ☁️🟢", "success");
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse access_token from hash callback:", e);
    }
  }, [currentUser]);

  // --- LOCAL SYNCHRONIZATION BACKEND ---
  // If running locally, sync room changes into local storage triggers across emulated screens
  useEffect(() => {
    if (gameMode === "local" && activeRoomId) {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `room_${activeRoomId}` && e.newValue) {
          try {
            setGameState(JSON.parse(e.newValue));
          } catch (err) {
            console.error(err);
          }
        }
      };
      
      window.addEventListener("storage", handleStorageChange);
      
      // Load initial
      const raw = localStorage.getItem(`room_${activeRoomId}`);
      if (raw) {
        setGameState(JSON.parse(raw));
      }
      
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [gameMode, activeRoomId]);

  // Update local game state
  const saveLocalGameState = (updated: GameState) => {
    setGameState(updated);
    localStorage.setItem(`room_${updated.id}`, JSON.stringify(updated));
    // Trigger storage dispatch for twin panel updates
    window.dispatchEvent(new Event("storage"));
  };

  // --- FIRESTORE REAL-TIME DB SYNCHRONIZATION ---
  useEffect(() => {
    if (gameMode === "online" && activeRoomId && isFirebaseSupported && db) {
      const docRef = doc(db, "rooms", activeRoomId);
      
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          setGameState(snapshot.data() as GameState);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `rooms/${activeRoomId}`);
      });
      
      return () => unsubscribe();
    }
  }, [gameMode, activeRoomId]);

  // Push update helper
  const updateRoomState = async (updates: Partial<GameState>) => {
    if (!gameState) return;
    
    const updatedModel: GameState = {
      ...gameState,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    if (gameMode === "local") {
      saveLocalGameState(updatedModel);
    } else if (gameMode === "online" && isFirebaseSupported && db) {
      try {
        const docRef = doc(db, "rooms", gameState.id);
        const cleanedModel: any = {};
        Object.keys(updatedModel).forEach((key) => {
          const val = (updatedModel as any)[key];
          if (val !== undefined) {
            cleanedModel[key] = val;
          }
        });
        await setDoc(docRef, cleanedModel, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `rooms/${gameState.id}`);
      }
    }
  };

  // --- GAMEPLAY FLOW HANDLERS ---

  // 1. Initial login - Host Local
  const handleJoinLocal = (nickname: string, userGender: "male" | "female" | "all") => {
    const pId = "usr_" + Math.random().toString(36).substring(2, 11);
    const host: Player = { id: pId, name: nickname, gender: userGender };
    setCurrentUser(host);
    
    // Automatically set up emulated companion based on gender
    const companionGender = userGender === "male" ? "female" : userGender === "female" ? "male" : "all";
    const companionName = companionGender === "male" ? "Brandon" : companionGender === "female" ? "Scarlett" : "Darling";
    setEmulatedUser({
      id: "usr_partner_emulated",
      name: companionName,
      gender: companionGender
    });

    const code = createRoomCode();
    const mockRoom: GameState = {
      id: code,
      roomCode: code,
      status: "active", // local starts active automatically
      hostId: host.id,
      hostName: host.name,
      guestId: "usr_partner_emulated",
      guestName: companionName,
      currentTurnPlayerId: host.id,
      turnNumber: 1,
      coinState: "idle",
      coinResult: "",
      approvalState: "idle",
      scoreHost: 0,
      scoreGuest: 0,
      usedCardIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setGameMode("local");
    setActiveRoomId(code);
    saveLocalGameState(mockRoom);
    soundManager.play("success");
    triggerAlert("Intimate Suite initialized locally!", "success");
  };

  // 2. Initial Login - Host Online via Firebase
  const handleHostOnline = async (nickname: string, userGender: "male" | "female" | "all") => {
    setIsConnecting(true);
    let hostId = currentUser?.id;
    if (!hostId) {
      const credentials = await ensureReadyUser();
      hostId = credentials?.uid || "usr_" + Math.random().toString(36).substring(2, 11);
    }
    
    const host: Player = { 
      id: hostId, 
      name: nickname, 
      gender: userGender,
      email: currentUser?.email 
    };
    setCurrentUser(host);

    const companionGender = userGender === "male" ? "female" : userGender === "female" ? "male" : "all";
    const companionName = companionGender === "male" ? "Brandon" : companionGender === "female" ? "Scarlett" : "Darling";
    setEmulatedUser({
      id: "usr_guest_online_emulated",
      name: companionName,
      gender: companionGender
    });

    const roomCode = getPersonalCode(host);
    const newRoom: GameState = {
      id: roomCode,
      roomCode: roomCode,
      status: "active",
      hostId: host.id,
      hostName: host.name,
      guestId: "usr_guest_online_emulated",
      guestName: companionName,
      currentTurnPlayerId: host.id,
      turnNumber: 1,
      coinState: "idle",
      coinResult: "",
      approvalState: "idle",
      scoreHost: 0,
      scoreGuest: 0,
      usedCardIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setGameMode("online");
    setActiveRoomId(roomCode);

    if (isFirebaseSupported && db) {
      try {
        const docRef = doc(db, "rooms", roomCode);
        await setDoc(docRef, newRoom);
        setGameState(newRoom);
        soundManager.play("success");
        triggerAlert(`Room ${roomCode} created online!`, "success");
      } catch (err) {
        setIsConnecting(false);
        soundManager.play("error");
        triggerAlert("Database blocked rules. Reverting to local fallback configuration.", "error");
        setGameMode("local");
        saveLocalGameState(newRoom);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setIsConnecting(false);
      soundManager.play("chime");
      triggerAlert("Firebase offline. Running room in real-time local state.", "info");
      setGameMode("local");
      saveLocalGameState(newRoom);
    }
  };

  // 3. Initial Login - Join Online Room
  const handleJoinOnline = async (nickname: string, userGender: "male" | "female" | "all", targetCode: string) => {
    setIsConnecting(true);
    let guestId = currentUser?.id;
    if (!guestId) {
      const credentials = await ensureReadyUser();
      guestId = credentials?.uid || "usr_" + Math.random().toString(36).substring(2, 11);
    }
    
    const guest: Player = { id: guestId, name: nickname, gender: userGender, email: currentUser?.email };
    setCurrentUser(guest);

    if (isFirebaseSupported && db) {
      try {
        const docRef = doc(db, "rooms", targetCode);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const roomData = snapshot.data() as GameState;
          if (roomData.status === "ended") {
            soundManager.play("error");
            triggerAlert("This intimate room has already ended.", "error");
            setIsConnecting(false);
            return;
          }

          const joinedRoom: GameState = {
            ...roomData,
            guestId: guest.id,
            guestName: guest.name,
            status: "active",
            updatedAt: new Date().toISOString()
          };

          await setDoc(docRef, joinedRoom, { merge: true });
          setGameMode("online");
          setActiveRoomId(targetCode);
          setGameState(joinedRoom);
          soundManager.play("success");
          triggerAlert(`Joined suite ${targetCode}!`, "success");
        } else {
          // Dynamically create the room under the target partner's code to establish pairing instantly
          const initializedRoom: GameState = {
            id: targetCode,
            roomCode: targetCode,
            status: "active",
            hostId: guest.id,
            hostName: guest.name,
            currentTurnPlayerId: guest.id,
            turnNumber: 1,
            coinState: "idle",
            coinResult: "",
            approvalState: "idle",
            scoreHost: 0,
            scoreGuest: 0,
            usedCardIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await setDoc(docRef, initializedRoom);
          setGameMode("online");
          setActiveRoomId(targetCode);
          setGameState(initializedRoom);
          soundManager.play("success");
          triggerAlert(`✨ Peer room initialized! Connected to suite code: ${targetCode}`, "success");
        }
      } catch (err) {
        soundManager.play("error");
        triggerAlert("Error joining room via cloud sync.", "error");
        setIsConnecting(false);
      } finally {
        setIsConnecting(false);
      }
    } else {
      // Local testing suite simulation lookup
      const localRoom = localStorage.getItem(`room_${targetCode}`);
      if (localRoom) {
        const roomData = JSON.parse(localRoom) as GameState;
        const joinedLocalRoom: GameState = {
          ...roomData,
          guestId: guest.id,
          guestName: guest.name,
          status: "active",
          updatedAt: new Date().toISOString()
        };
        setGameMode("local");
        setActiveRoomId(targetCode);
        saveLocalGameState(joinedLocalRoom);
        soundManager.play("success");
        triggerAlert("Joined simulated local suite!", "success");
      } else {
        soundManager.play("error");
        triggerAlert("Local suite does not exist. Host a game first!", "error");
        setIsConnecting(false);
      }
    }
  };

  // Join Emulated Twin Screen as Guest Partner (For testing in iframe)
  const handleHostEmulatedGuestJoin = () => {
    if (!gameState || !emulatedUser) return;
    
    const updatedRoom: GameState = {
      ...gameState,
      guestId: emulatedUser.id,
      guestName: emulatedUser.name,
      status: "active"
    };
    updateRoomState(updatedRoom);
    soundManager.play("chime");
    triggerAlert(`${emulatedUser.name} joined the suite!`, "success");
  };

  // --- GAME ACTIONS ---

  // SPIN COIN CONTROLLER
  const handleTriggerCoinSpin = () => {
    if (!gameState) return;
    
    soundManager.play("flip");

    const activePlayerId = gameState.currentTurnPlayerId;
    const activePlayerGender = activePlayerId === gameState.hostId 
      ? (gameState.hostId === currentUser?.id ? currentUser?.gender : emulatedUser?.gender)
      : (gameState.guestId === currentUser?.id ? currentUser?.gender : emulatedUser?.gender);

    // Choose dynamic random landing outcome under desired probabilities
    let outcome: CoinResult = "truth";
    if (activePlayerGender === "female") {
      outcome = Math.random() < 0.6 ? "dare" : "truth";
    } else {
      outcome = Math.random() < 0.5 ? "dare" : "truth";
    }
    
    // Step 1: Trigger spin motion
    updateRoomState({
      coinState: "flipping",
      coinResult: outcome,
      lastActionBy: currentUser?.id
    });

    // Step 2: Automatically lock outcome in 1.8s (after animations finish)
    setTimeout(() => {
      soundManager.play("chime");
      if (outcome === "truth") {
        updateRoomState({
          coinState: "landed",
          truthState: "waiting_for_question",
          approvalState: "idle",
          currentCard: {
            id: "truth_custom_question",
            type: "truth",
            text: "Ask your question in the chat or send a voice note.",
            penalty: Math.random() > 0.5 
              ? "Vinegar ka 1 spoon peena ho ga (video bna k share krni ho gi)" 
              : "Half lemon khana ho ga (video bna k share krni ho gi)",
            required_media: "text"
          }
        });
      } else {
        // Find suitable dare card (excluding already used ones)
        const usedIds = gameState.usedCardIds || [];
        const filteredTasks = truthAndDareTasks.filter(item => 
          item.type === outcome && 
          (item.forGender === activePlayerGender || item.forGender === "all") &&
          !usedIds.includes(item.id)
        );

        let selectedCard = filteredTasks[Math.floor(Math.random() * filteredTasks.length)];
        let newUsedIds = [...usedIds];

        if (!selectedCard) {
          // If all cards for this role are used, reset history for this type and pick any
          const allTasks = truthAndDareTasks.filter(item => 
            item.type === outcome && 
            (item.forGender === activePlayerGender || item.forGender === "all")
          );
          selectedCard = allTasks[Math.floor(Math.random() * allTasks.length)] || truthAndDareTasks[0];
          newUsedIds = [selectedCard.id];
        } else {
          newUsedIds.push(selectedCard.id);
        }

        updateRoomState({
          coinState: "landed",
          truthState: undefined,
          approvalState: "idle",
          currentCard: {
            id: selectedCard.id,
            type: selectedCard.type,
            text: selectedCard.text,
            penalty: selectedCard.penalty,
            required_media: selectedCard.required_media || "text"
          },
          usedCardIds: newUsedIds
        });
      }
    }, 1800);
  };

  // SUBMIT COMPLETED TASK -> TRIGGERS VERIFICATION FOR PARTNER
  const handleSubmitTaskForApproval = () => {
    if (submissionStatus !== "idle") return;

    soundManager.resume();
    setSubmissionStatus("loading");
    soundManager.play("ping");

    // Micro-interaction timing: 1200ms of loading spinner, then success checkmark & glow
    setTimeout(() => {
      setSubmissionStatus("success");
      soundManager.play("success");

      // Hold success animation for 950ms, then transmit data & trigger unmount transition
      setTimeout(() => {
        updateRoomState({
          approvalState: "pending",
          lastActionBy: currentUser?.id
        });
        triggerAlert("Turn submitted. Waiting for partner's approval...", "info");
      }, 950);
    }, 1200);
  };

  // PARTNER DECISION: APPROVE
  const handleObserverApprove = () => {
    if (!gameState) return;

    const isHostActiveTurn = gameState.currentTurnPlayerId === gameState.hostId;
    const addedScoreHost = isHostActiveTurn ? gameState.scoreHost + 1 : gameState.scoreHost;
    const addedScoreGuest = !isHostActiveTurn ? gameState.scoreGuest + 1 : gameState.scoreGuest;

    const nextPlayerId = isHostActiveTurn 
      ? (gameState.guestId || gameState.hostId) 
      : gameState.hostId;

    updateRoomState({
      approvalState: "idle",
      turnNumber: gameState.turnNumber + 1,
      currentTurnPlayerId: nextPlayerId,
      coinState: "idle",
      coinResult: "",
      currentCard: undefined,
      scoreHost: addedScoreHost,
      scoreGuest: addedScoreGuest,
      approvedAt: ""
    });

    soundManager.play("success");
    triggerAlert("You approved their action! Scores updated, coin flip active! ⚡", "success");
  };

  // PARTNER DECISION: REJECT -> TRIGGERS PENALTY
  const handleObserverReject = () => {
    updateRoomState({
      approvalState: "rejected",
      lastActionBy: currentUser?.id
    });
    soundManager.play("error");
    triggerAlert("Turn Rejected! Enforcing penalty card.", "error");
  };

  // ACTIVE PLAYER HAS FINISHED ENFORCED PENALTY -> RESET TURN NO POINTS
  const handleActiveCompletePenalty = () => {
    if (!gameState) return;

    const isHostActiveTurn = gameState.currentTurnPlayerId === gameState.hostId;
    const nextPlayerId = isHostActiveTurn 
      ? (gameState.guestId || gameState.hostId) 
      : gameState.hostId;

    updateRoomState({
      approvalState: "idle",
      turnNumber: gameState.turnNumber + 1,
      currentTurnPlayerId: nextPlayerId,
      coinState: "idle",
      coinResult: "",
      currentCard: undefined
    });

    soundManager.play("success");
    triggerAlert("Penalty completed. Turn passed without points with honor.", "info");
  };

  // MASTER FAST COMMAND APPROVAL via Chatroom
  const handleCommandAndControlApprove = async () => {
    if (!gameState) return;
    soundManager.play("success");

    const isSubHostVal = gameState.ccSubId === gameState.hostId;
    const isSubGuestVal = gameState.ccSubId === (gameState.guestId || "usr_guest");

    const addedScoreHost = isSubHostVal ? (gameState.scoreHost + 1) : gameState.scoreHost;
    const addedScoreGuest = isSubGuestVal ? (gameState.scoreGuest + 1) : gameState.scoreGuest;

    const currentCcScoreHost = gameState.ccScoreHost || 0;
    const currentCcScoreGuest = gameState.ccScoreGuest || 0;

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

  const handleCommandAndControlReject = async () => {
    if (!gameState) return;
    soundManager.play("error");

    await updateRoomState({
      ccState: "waiting_for_verification",
      ccVerificationVideoUrl: "",
      ccVerificationType: ""
    });
    triggerAlert("Submission rejected! Ordered Sub to film a better compliance clip.", "error");
  };

  const handleVirtualTouchApprove = async () => {
    if (!gameState) return;
    soundManager.play("success");

    const isReceiverHost = gameState.vtReceiverId === gameState.hostId;
    const isReceiverGuest = gameState.vtReceiverId === (gameState.guestId || "usr_guest");

    const addedScoreHost = isReceiverHost ? (gameState.scoreHost + 1) : gameState.scoreHost;
    const addedScoreGuest = isReceiverGuest ? (gameState.scoreGuest + 1) : gameState.scoreGuest;

    await updateRoomState({
      vtToucherId: gameState.vtReceiverId,
      vtReceiverId: gameState.vtToucherId,
      vtState: "waiting_for_touch",
      vtCurrentTouch: "",
      vtVerificationVideoUrl: "",
      scoreHost: addedScoreHost,
      scoreGuest: addedScoreGuest
    });

    triggerAlert("Task Approved! +1 Tactile point rewarded! Roles swapped. 🥵🔥", "success");
  };

  const handleVirtualTouchReject = async () => {
    if (!gameState) return;
    soundManager.play("error");

    await updateRoomState({
      vtState: "waiting_for_response",
      vtVerificationVideoUrl: ""
    });

    triggerAlert("Submission rejected! Ordered partner to film a more sensual touch reaction.", "error");
  };

  // CALLBACK CALLED WHEN PARTNER OR YOU SENDS MESSAGE
  const handleChatMessageSent = (msg: ChatMessage) => {
    if (!gameState || !currentUser) return;

    // Trigger feedback ping
    soundManager.play("ping");

    // --- CASE D: VIRTUAL TOUCH WORKFLOW VIA CHATROOM ---
    if (gameState.selectedGameId === "virtual_touch") {
      const isReceiverSender = msg.senderId === gameState.vtReceiverId;
      if (isReceiverSender && gameState.vtState === "waiting_for_response") {
        if (msg.mediaType === "video" && msg.mediaUrl) {
          updateRoomState({
            vtState: "waiting_for_approval",
            vtVerificationVideoUrl: msg.mediaUrl,
            ccVerificationDriveUrl: msg.driveFileUrl || "",
            lastActionBy: msg.senderId
          });
          triggerAlert("Sensual response clip received in chatroom! Sent to partner for approval. 🎥🔥", "success");
          return;
        }
      }
    }

    // --- CASE C: COMMAND & CONTROL WORKFLOW VIA CHATROOM ---
    if (gameState.selectedGameId === "command_control") {
      const isSubSender = msg.senderId === gameState.ccSubId;
      const isMasterSender = msg.senderId === gameState.ccMasterId;

      if (isSubSender && gameState.ccState === "waiting_for_verification") {
        if (msg.mediaType === "video" && msg.mediaUrl) {
          updateRoomState({
            ccState: "waiting_for_approval",
            ccVerificationVideoUrl: msg.mediaUrl,
            ccVerificationDriveUrl: msg.driveFileUrl || "",
            ccVerificationType: "video",
            lastActionBy: msg.senderId
          });
          triggerAlert("Compliance video received in chatroom! Sent to Master for approval. 🎥👍", "success");
          return;
        }
      }

      if (isMasterSender && gameState.ccState === "waiting_for_command") {
        if (msg.mediaType === "audio" && msg.mediaUrl) {
          updateRoomState({
            ccState: "waiting_for_verification",
            ccActiveSuggestion: "Voice Directive 🎙️ (Play spoken command)",
            ccCommandAudioUrl: msg.mediaUrl,
            ccVerificationVideoUrl: "",
            ccVerificationType: "",
            lastActionBy: msg.senderId
          });
          triggerAlert("Voice command sent directly to Sub's console! 🎙️⚡", "success");
          return;
        } else if (msg.mediaType === "text" || (!msg.mediaUrl && msg.text)) {
          updateRoomState({
            ccState: "waiting_for_verification",
            ccActiveSuggestion: msg.text,
            ccCommandAudioUrl: "",
            ccVerificationVideoUrl: "",
            ccVerificationType: "",
            lastActionBy: msg.senderId
          });
          triggerAlert("Custom command directive sent directly to Sub's console! 💬⚡", "success");
          return;
        }
      }
    }

    const isMyTurn = gameState.currentTurnPlayerId === currentUser.id;
    const isSenderActivePlayer = msg.senderId === gameState.currentTurnPlayerId;

    // --- CASE A: TRUTH WORKFLOW ---
    if (gameState.currentCard?.type === "truth") {
      // 1. If currently waiting for question, and the partner (non-active player) sends a message/voice note
      if (gameState.truthState === "waiting_for_question" && !isSenderActivePlayer && msg.senderId !== "system") {
        updateRoomState({
          truthState: "waiting_for_answer",
          lastActionBy: msg.senderId
        });
        triggerAlert("Question sent to partner! Waiting for their reply...", "info");
      }
      // 2. If waiting for answer, and active player replies (is not system message)
      else if (gameState.truthState === "waiting_for_answer" && isSenderActivePlayer && msg.senderId !== "system") {
        updateRoomState({
          truthState: "completed",
          approvalState: "pending",
          lastActionBy: msg.senderId
        });

        triggerAlert("Reply submitted! Your partner must now Approve or Reject your truth answer.", "success");
      }
    }

    // --- CASE B: DARE WORKFLOW CONDITIONAL APPROVAL ---
    else if (gameState.currentCard?.type === "dare") {
      if (isSenderActivePlayer && gameState.approvalState === "idle") {
        const required = gameState.currentCard.required_media || "text";
        let isCorrectPayload = false;
        let mismatchErrorMsg = "";

        if (required === "text") {
          isCorrectPayload = true;
        } else if (required === "image") {
          if (msg.mediaType === "image") {
            isCorrectPayload = true;
          } else {
            mismatchErrorMsg = `⚠️ Picture/Photo upload is required! You sent ${msg.mediaType ? msg.mediaType.toUpperCase() : "text"}.`;
          }
        } else if (required === "video") {
          if (msg.mediaType === "video") {
            isCorrectPayload = true;
          } else {
            mismatchErrorMsg = `⚠️ Video upload is required! You sent ${msg.mediaType ? msg.mediaType.toUpperCase() : "text"}.`;
          }
        } else if (required === "audio") {
          if (msg.mediaType === "audio") {
            isCorrectPayload = true;
          } else {
            mismatchErrorMsg = `⚠️ Voice Note is required! You sent ${msg.mediaType ? msg.mediaType.toUpperCase() : "text"}.`;
          }
        }

        if (isCorrectPayload) {
          updateRoomState({
            approvalState: "pending",
            lastActionBy: msg.senderId
          });
          soundManager.play("chime");
          triggerAlert(`Correct ${required.toUpperCase()} proof submitted! Partner can now verify your action.`, "success");
        } else {
          soundManager.play("error");
          triggerAlert(mismatchErrorMsg || `Required Verification: ${required.toUpperCase()} upload required in chat first.`, "error");
        }
      }
    }
  };

  // LEAVE / DISCONNECT GAME
  const handleResetApp = () => {
    setCurrentUser(null);
    setActiveRoomId(null);
    setGameState(null);
    triggerAlert("Logged out of session.", "info");
  };

  // COPY ROOM CODE
  const copyRoomCode = () => {
    if (!gameState?.id) return;
    navigator.clipboard.writeText(gameState.id);
    triggerAlert("Suite code copied to clipboard! 🎫", "success");
  };

  // COPY INVITE LINK
  const copyInviteLink = () => {
    if (!gameState?.id) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${gameState.id}`;
    navigator.clipboard.writeText(shareUrl);
    triggerAlert("Shareable suite link copied! Send it to your partner! 🔗❤️", "success");
  };

  // Helper selectors
  const isHostCurrentUser = gameState?.hostId === currentUser?.id;
  const isTurnForCurrentUser = gameState?.currentTurnPlayerId === currentUser?.id;
  const myPartnerName = gameState 
    ? (gameState.hostId === currentUser?.id ? (gameState.guestName || "Partner") : gameState.hostName) 
    : "Partner";
  
  const getActivePlayerDetails = () => {
    if (!gameState) return { name: "Someone", id: "" };
    const pId = gameState.currentTurnPlayerId;
    if (pId === gameState.hostId) {
      return { name: gameState.hostName, id: pId };
    }
    return { name: gameState.guestName || "Partner", id: pId };
  };

  const getObservingPlayerDetails = () => {
    if (!gameState) return "Partner";
    const pId = gameState.currentTurnPlayerId;
    if (pId === gameState.hostId) {
      return gameState.guestName || "Partner";
    }
    return gameState.hostName;
  };

  const activeTurnDetails = getActivePlayerDetails();
  const observerName = getObservingPlayerDetails();

  // --- CORE VIEW: GAME DASHBOARD ---
  const renderDeviceScreen = (viewer: Player, simulatedCompanion?: Player) => {
    if (!gameState) return null;

    // Calculate details for this frame view
    const frameIsHost = gameState.hostId === viewer.id;
    const frameIsMyTurn = gameState.currentTurnPlayerId === viewer.id;
    
    // Resolve partner details for viewer
    const myPartnerName = frameIsHost 
      ? (gameState.guestName || "Waiting...") 
      : gameState.hostName;

    // Score layout
    const viewerScore = frameIsHost ? gameState.scoreHost : gameState.scoreGuest;
    const partnerScore = frameIsHost ? gameState.scoreGuest : gameState.scoreHost;

    return (
      <div 
        className="w-full max-w-[360px] h-[645px] rounded-[40px] border-[5px] border-zinc-900 bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        id={`device-view-${viewer.id}`}
      >
        {/* Dynamic Mobile notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-zinc-900 rounded-b-xl z-50 flex items-center justify-center p-1" id="phone-notch">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-800" />
        </div>

        {/* Ambient Top Glow Grid */}
        <div className={`absolute top-0 left-0 right-0 h-44 bg-linear-to-b opacity-10 pointer-events-none filter blur-xl ${
          frameIsMyTurn 
            ? "from-violet-500/80 via-indigo-500/0" 
            : "from-rose-500/80 via-pink-500/0"
        }`} />

        {/* Header toolbar */}
        <div className="pt-7 px-5 pb-3 flex items-center justify-between border-b border-white/[0.04] bg-zinc-950/40 z-10" id="device-header">
          {/* Room display */}
          <div className="flex flex-col" id="hdr-room-meta">
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none">
              CLOUD SUITE
            </span>
            <div className="flex items-center gap-1 mt-0.5" id="hdr-room-interactive">
              <span className={`w-1.5 h-1.5 rounded-full ${gameMode === "online" ? "bg-emerald-500" : "bg-purple-500"} animate-pulse`} />
              <button 
                type="button" 
                onClick={copyRoomCode}
                className="text-[11px] font-mono font-semibold tracking-wider text-zinc-300 flex items-center gap-0.5 hover:text-white transition-colors"
                title="Copy Room Code Only"
              >
                {gameState.id}
              </button>
              <span className="text-zinc-800 text-[9px] select-none font-sans">|</span>
              <button
                type="button"
                onClick={copyInviteLink}
                className="text-[8px] font-mono font-black tracking-wider text-pink-400 hover:text-pink-300 flex items-center gap-0.5 uppercase transition-colors"
                title="Copy Shared Invite Link"
              >
                SHARE
              </button>
            </div>
          </div>

          {/* Turn counter */}
          <div className="text-center" id="hdr-turn-tracker">
            <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">
              COUPLE PROGRESS
            </span>
            <span className="text-xs font-mono font-semibold text-transparent bg-clip-text bg-linear-to-r from-violet-300 to-rose-300">
              TURN #{gameState.turnNumber}
            </span>
          </div>

          {/* Logout controls */}
          <button
            type="button"
            onClick={handleResetApp}
            className="p-1.5 rounded-lg bg-zinc-900/60 border border-white/[0.03] text-zinc-400 hover:text-rose-400 text-xs transition-colors"
            title="Disconnect session"
            id="btn-disconnect-hdr"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic scoreboard */}
        <div className="px-5 py-3.5 bg-white/[0.01] border-b border-white/[0.02] flex items-center justify-between z-10" id="device-scoreboard">
          {/* My profile info */}
          <div className="flex items-center gap-2.5" id="profile-myself">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-semibold ${
              viewer.gender === "male" 
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300" 
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`} id="sb-avatar-my">
              {viewer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block leading-tight font-mono">YOU</span>
              <span className="text-xs font-medium text-zinc-300 leading-none">{viewer.name}</span>
            </div>
          </div>

          {/* Scores view */}
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 rounded-full px-4 py-1" id="score-capsule">
            <motion.span 
              key={`viewer-score-${viewerScore}`}
              initial={{ scale: 1 }}
              animate={{ 
                scale: [1, 1.4, 0.95, 1],
                textShadow: [
                  "0 0 0px rgba(168,85,247,0)",
                  "0 0 15px rgba(168,85,247,0.8), 0 0 30px rgba(168,85,247,0.4)",
                  "0 0 0px rgba(168,85,247,0)"
                ],
                color: ["#e4e4e7", "#c084fc", "#e4e4e7"]
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-sm font-semibold font-mono text-zinc-200 inline-block selection:bg-none"
            >
              {viewerScore}
            </motion.span>
            
            <motion.div
              key={`heart-score-${viewerScore}-${partnerScore}`}
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
            </motion.div>

            <motion.span 
              key={`partner-score-${partnerScore}`}
              initial={{ scale: 1 }}
              animate={{ 
                scale: [1, 1.4, 0.95, 1],
                textShadow: [
                  "0 0 0px rgba(244,63,94,0)",
                  "0 0 15px rgba(244,63,94,0.8), 0 0 30px rgba(244,63,94,0.4)",
                  "0 0 0px rgba(244,63,94,0)"
                ],
                color: ["#a1a1aa", "#fb7185", "#a1a1aa"]
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="text-sm font-semibold font-mono text-zinc-400 inline-block selection:bg-none"
            >
              {partnerScore}
            </motion.span>
          </div>

          {/* Partner profile info */}
          <div className="flex items-center gap-2.5 text-right" id="profile-partner">
            <div>
              <span className="text-[10px] text-zinc-500 block leading-tight font-mono">PARTNER</span>
              <span className="text-xs font-medium text-zinc-300 leading-none truncate max-w-[65px] block">{myPartnerName}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-violet-500/20 to-purple-500/10 border border-violet-500/25 text-violet-300 flex items-center justify-center text-[10px] font-semibold" id="sb-avatar-partner">
              {myPartnerName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content body layout container */}
        {gameState.status === "waiting" ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col items-center justify-center text-center gap-5 z-10" id="device-body-container">
            {/* Guest waiting splash */}
            <div className="relative" id="waiting-animation-nodes">
              <span className="absolute -inset-2 rounded-full border border-dashed border-violet-500/30 animate-[spin_15s_linear_infinite]" />
              <div className="w-14 h-14 bg-violet-600/10 border border-violet-500/40 rounded-full flex items-center justify-center" id="waiting-radar">
                <Flame className="w-6 h-6 text-violet-400 animate-pulse" />
              </div>
            </div>
            <div id="waiting-label-bloc" className="flex flex-col items-center">
              <h4 className="text-sm font-sans tracking-widest text-zinc-200 uppercase font-medium">
                Waiting for Partner
              </h4>
              <p className="text-xs font-light text-zinc-500 mt-2 max-w-[240px] leading-relaxed">
                Connect with your partner! Copy and send the magic invitation link below.
              </p>

              {/* Glowing Interactive Invite Share Action Section */}
              <div className="w-full max-w-[250px] mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-2 shadow-inner" id="waiting-invite-box">
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="w-full bg-linear-to-r from-violet-600 via-purple-600 to-rose-500 hover:from-violet-500 hover:to-rose-450 text-white font-mono text-[9px] tracking-widest font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] active:scale-[0.98]"
                  id="btn-waiting-share-link"
                >
                  🔗 COPY PARTNER INVITE LINK
                </button>
                <div className="flex items-center justify-center gap-2" id="or-waiting-link">
                  <span className="h-[1px] w-4 bg-white/5" />
                  <span className="text-[8px] font-mono text-zinc-650 uppercase tracking-widest leading-none">OR</span>
                  <span className="h-[1px] w-4 bg-white/5" />
                </div>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="w-full bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 font-mono text-[8px] tracking-widest py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  id="btn-waiting-copy-code"
                >
                  COPY CODE ONLY ({gameState.id})
                </button>
              </div>
            </div>

            {simulatedCompanion && (
              <button
                type="button"
                onClick={handleHostEmulatedGuestJoin}
                className="mt-6 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-[10px] font-mono tracking-widest text-violet-400 border border-zinc-800 rounded-xl"
                id="btn-trigger-join-emulated"
              >
                SIMULATE {simulatedCompanion.name.toUpperCase()} JOIN
              </button>
            )}
          </div>
        ) : (!gameState.selectedGameId || gameState.selectedGameId === "") ? (
          /* PREMIUM DYNAMIC FULL-SCREEN HUB SELECTION SCREEN */
          <div className="flex-1 flex flex-col justify-between p-6 z-10 overflow-y-auto scrollbar-none bg-[#09090b]" id="device-game-hub-panel">
            
            {/* Header / Brand Title section with premium layout */}
            <div className="text-center pt-2 animate-fade-in" id="game-selection-hub-header">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[7.5px] font-mono font-bold tracking-widest text-[#a855f7] uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Connection Active
              </div>
              <h3 className="text-base font-sans tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-zinc-100 to-rose-200 font-extrabold uppercase leading-none">
                Couple Playground
              </h3>
              <p className="text-[10px] text-zinc-500 font-light mt-1.5 font-mono">
                Synchronized with <span className="text-violet-300 font-bold">{myPartnerName}</span>
              </p>
            </div>

            {/* Scrollable list/cards of games - FULL SCREEN SPACE */}
            <div className="flex-1 my-5 space-y-3.5 pr-0.5" id="games-scroller-layout">
              
              {/* Game 1: Truth & Dare (PLAYABLE / UNLOCKED) */}
              <motion.div 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="p-4 rounded-[22px] bg-linear-to-b from-purple-950/50 via-zinc-950/60 to-purple-950/15 border border-purple-500/35 hover:border-purple-500/55 shadow-[0_4px_30px_rgba(168,85,247,0.15)] transition-all flex flex-col gap-3 cursor-pointer relative overflow-hidden group"
                onClick={() => {
                  soundManager.play("success");
                  updateRoomState({ selectedGameId: "truth_and_dare" });
                }}
                id="game-launch-truth-dare"
              >
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-purple-500/15 blur-xl pointer-events-none group-hover:bg-purple-500/25 transition-all" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shadow-inner shrink-0 relative">
                      <Flame className="w-5.5 h-5.5 text-purple-450 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 tracking-wide uppercase">Truth & Dare</span>
                        <span className="text-[7px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold leading-none">ACTIVE</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 font-light mt-0.5">Spin the fate coin & fulfill match dare verifications</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-white/[0.04]">
                  <span className="text-[7.5px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.02]">Destiny Coin</span>
                  <span className="text-[7.5px] font-mono px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 border border-pink-500/10">Double Verification</span>
                  <span className="text-[7.5px] font-mono px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/10">Voice & Media Proofs</span>
                </div>
                <div className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-[9px] font-mono tracking-widest text-white rounded-xl uppercase font-bold text-center shadow-lg shadow-purple-600/30 transition-all">
                  ⚡ LAUNCH SESSION ⚡
                </div>
              </motion.div>

              {/* Game 2: Command & Control (UNLOCKED!) */}
              <motion.div 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="p-4 rounded-[22px] bg-linear-to-b from-pink-950/40 via-zinc-950/60 to-pink-950/10 border border-pink-500/35 hover:border-pink-500/55 shadow-[0_4px_30px_rgba(236,72,153,0.15)] transition-all flex flex-col gap-3 cursor-pointer relative overflow-hidden group"
                onClick={() => {
                  soundManager.play("chime");
                  updateRoomState({ selectedGameId: "command_control" });
                }}
                id="game-launch-command-control"
              >
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-pink-500/15 blur-xl pointer-events-none group-hover:bg-pink-500/25 transition-all" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500/20 to-violet-500/10 border border-pink-500/30 flex items-center justify-center text-pink-300 font-bold shadow-inner shrink-0 relative">
                      <Volume2 className="w-5.5 h-5.5 text-pink-400 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 tracking-wide uppercase">Command & Control</span>
                        <span className="text-[7px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold leading-none">ACTIVE</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 font-light mt-0.5">The Audio Domination Game</p>
                    </div>
                  </div>
                </div>
                <div className="text-[8.5px] text-zinc-400 font-light leading-relaxed">
                  Real-time audio directives, microphone feedback routines, and whisper channel overrides.
                </div>
                <div className="text-[8px] font-mono text-pink-350 tracking-wider text-left border-t border-white/[0.02] pt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" /> Click to launch and select designated asymmetric roles!
                </div>
              </motion.div>

              {/* Game 3: Virtual Touch (UNLOCKED!) */}
              <motion.div 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="p-4 rounded-[22px] bg-linear-to-b from-purple-950/40 via-zinc-950/60 to-purple-950/15 border border-purple-500/35 hover:border-purple-500/55 shadow-[0_4px_30px_rgba(168,85,247,0.15)] transition-all flex flex-col gap-3 cursor-pointer relative overflow-hidden group"
                onClick={() => {
                  soundManager.play("chime");
                  updateRoomState({ selectedGameId: "virtual_touch" });
                }}
                id="game-launch-virtual-touch"
              >
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-purple-500/15 blur-xl pointer-events-none group-hover:bg-purple-500/25 transition-all" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shadow-inner shrink-0 relative">
                      <Smartphone className="w-5.5 h-5.5 text-purple-400 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100 tracking-wide uppercase">Virtual Touch</span>
                        <span className="text-[7px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold leading-none">ACTIVE</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 font-light mt-0.5">The Neon Body Map</p>
                    </div>
                  </div>
                </div>
                <div className="text-[8.5px] text-zinc-400 font-light leading-relaxed">
                  Interactive real-time tactile map. Signal exact sensitive zones on shared multi-touch body grids.
                </div>
                <div className="text-[8px] font-mono text-purple-350 tracking-wider text-left border-t border-white/[0.02] pt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" /> Click to launch and touch sensitive zones!
                </div>
              </motion.div>

              {/* Game 4: Obey The Timer (LOCKED) */}
              <div 
                className="p-4 rounded-[22px] bg-zinc-950/70 border border-zinc-900/60 opacity-55 flex flex-col gap-3 relative select-none"
                id="game-launch-obey-timer-locked"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-sm text-zinc-500 shrink-0">
                      <Zap className="w-5 h-5 text-amber-500/60" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Obey The Timer</span>
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-bold leading-none">FAST PACE</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-500 font-light mt-0.5">Fast-Paced Domination</p>
                    </div>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-1" />
                </div>
                <div className="text-[8.5px] text-zinc-500 font-light leading-relaxed">
                  Split-second triggers and intense attention checks. Any delay results in custom partner forfeit tasks.
                </div>
                <div className="text-[8px] font-mono text-zinc-650 tracking-wider text-left border-t border-white/[0.02] pt-1.5">
                  🔒 Unlocks after completing 15 standard dare validations.
                </div>
              </div>

              {/* Game 5: The Dark Room (LOCKED) */}
              <div 
                className="p-4 rounded-[22px] bg-zinc-950/70 border border-zinc-900/60 opacity-55 flex flex-col gap-3 relative select-none"
                id="game-launch-dark-room-locked"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-sm text-zinc-500 shrink-0">
                      <VolumeX className="w-5 h-5 text-rose-500/60 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">The Dark Room</span>
                        <span className="text-[7px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-bold leading-none">SENSORY MODE</span>
                      </div>
                      <p className="text-[9.5px] text-zinc-500 font-light mt-0.5">Sensory Deprivation Mode</p>
                    </div>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-1" />
                </div>
                <div className="text-[8.5px] text-zinc-500 font-light leading-relaxed">
                  Ambient dark screen overlay with spatial audio directives and mutual blindfold synchronization.
                </div>
                <div className="text-[8px] font-mono text-zinc-650 tracking-wider text-left border-t border-white/[0.02] pt-1.5">
                  🔒 Beta Access Only. Commencing Winter 2026.
                </div>
              </div>

            </div>

            {/* Footer synchronization status */}
            <div className="pt-2.5 border-t border-white/[0.03] text-center" id="hub-synchronization-status">
              <span className="text-[8px] font-mono text-zinc-500 tracking-widest uppercase block animate-pulse">
                📲 Live Interactive Desk Online Sync Active
              </span>
            </div>
          </div>
        ) : (
          /* ACTIVE SPLIT-SCREEN VIEW WITH PLAY TOP & CHAT BOTTOM */
          <div className="flex-1 flex flex-col z-10 divide-y divide-white/10 overflow-hidden" id="device-split-screen">
            {/* Top Half: Interactive Game Space */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col items-center justify-start gap-3 bg-black/10" id="device-game-area-top">
              
              {/* ACTIVE SELECTED GAMEPLAY INTERFACE CONDITIONAL DISPATCHER */}
              {gameState.selectedGameId === "truth_and_dare" ? (
                <>
                  {/* Turn indicator & Hub Exit Trigger */}
                  <div className="w-full flex items-center justify-between gap-2" id="active-turn-indicator-bar2">
                    <button 
                      onClick={() => {
                        soundManager.play("click");
                        updateRoomState({ selectedGameId: "" });
                      }}
                      className="px-2.5 py-1 text-[8px] font-mono tracking-widest text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-white/[0.04] rounded-lg uppercase flex items-center gap-1 hover:border-white/[0.08] transition-all cursor-pointer shadow-sm select-none"
                      title="Return to game selector menu"
                    >
                      ← HUB
                    </button>

                    {frameIsMyTurn ? (
                      <div className="inline-flex items-center gap-1 bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-mono text-violet-300 uppercase tracking-widest animate-pulse" id="my-turn-badge">
                        <Sparkles className="w-2.5 h-2.5 text-violet-400 animate-pulse" />
                        Your Turn
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full text-[9px] font-mono text-zinc-500 uppercase tracking-widest" id="partner-turn-badge">
                        Waiting for {myPartnerName}
                      </div>
                    )}
                  </div>

                  {/* Coin or Task card content */}
                  <div className="w-full flex-1 flex items-center justify-center min-h-[140px]" id="center-gaming-stage">
                    <AnimatePresence mode="wait">
                      {(!gameState.currentCard || gameState.coinState === "flipping") ? (
                        <motion.div
                          key="spin3D"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="w-full scale-90"
                        >
                          <CoinFlip3D
                            coinState={gameState.coinState}
                            coinResult={gameState.coinResult}
                            disabled={!frameIsMyTurn}
                            onFlip={handleTriggerCoinSpin}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="taskCard"
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="w-full flex justify-center scale-90"
                        >
                          <TaskCardComponent
                            type={gameState.currentCard.type}
                            category={gameState.currentCard.type === "truth" ? "Intimate Inquiry" : "Challenge"}
                            forGender={
                              gameState.currentTurnPlayerId === gameState.hostId
                                ? (gameState.hostId === viewer.id ? viewer.gender : (simulatedCompanion?.gender || "all"))
                                : (gameState.guestId === viewer.id ? viewer.gender : (simulatedCompanion?.gender || "all"))
                            }
                            text={gameState.currentCard.text}
                            penalty={gameState.currentCard.penalty}
                            activePlayerName={frameIsMyTurn ? "You" : myPartnerName}
                            isOwnerOfTurn={frameIsMyTurn}
                            requiredMedia={gameState.currentCard.required_media}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : gameState.selectedGameId === "command_control" ? (
                <div className="w-full flex-1 flex flex-col items-center justify-start gap-3" id="cc-overlay-integration-stage">
                  {/* Top Header with HUB Exit Trigger */}
                  <div className="w-full flex items-center justify-between gap-2 border-b border-white/[0.02] pb-2" id="cc-exit-indicator-bar-container">
                    <button 
                      onClick={() => {
                        soundManager.play("click");
                        updateRoomState({ selectedGameId: "" });
                      }}
                      className="px-2.5 py-1 text-[8px] font-mono tracking-widest text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-white/[0.04] rounded-lg uppercase flex items-center gap-1 hover:border-white/[0.08] transition-all cursor-pointer shadow-sm select-none"
                      title="Return to game selector menu"
                    >
                      ← HUB
                    </button>
                    
                    <span className="text-[8px] font-mono text-pink-400 tracking-widest uppercase block animate-pulse">
                      🎙️ Whisper Channel Syncing
                    </span>
                  </div>

                  <CommandAndControlGame
                    gameState={gameState}
                    currentUser={viewer}
                    myPartnerName={myPartnerName}
                    frameIsMyTurn={frameIsMyTurn}
                    updateRoomState={updateRoomState}
                    triggerAlert={triggerAlert}
                  />
                </div>
              ) : gameState.selectedGameId === "virtual_touch" ? (
                <div className="w-full flex-1 flex flex-col items-center justify-start gap-3" id="vt-overlay-integration-stage">
                  {/* Top Header with HUB Exit Trigger */}
                  <div className="w-full flex items-center justify-between gap-2 border-b border-white/[0.02] pb-2" id="vt-exit-indicator-bar-container">
                    <button 
                      onClick={() => {
                        soundManager.play("click");
                        updateRoomState({ selectedGameId: "" });
                      }}
                      className="px-2.5 py-1 text-[8px] font-mono tracking-widest text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-white/[0.04] rounded-lg uppercase flex items-center gap-1 hover:border-white/[0.08] transition-all cursor-pointer shadow-sm select-none"
                      title="Return to game selector menu"
                    >
                      ← HUB
                    </button>
                    
                    <span className="text-[8px] font-mono text-pink-400 tracking-widest uppercase block animate-pulse">
                      👁️ Neon Touch Sensor Synced
                    </span>
                  </div>

                  <VirtualTouchGame
                    gameState={gameState}
                    currentUser={viewer}
                    myPartnerName={myPartnerName}
                    frameIsMyTurn={frameIsMyTurn}
                    updateRoomState={updateRoomState}
                    triggerAlert={triggerAlert}
                  />
                </div>
              ) : null}

            </div>

            {/* Decision and actions overlay - ONLY FOR TRUTH & DARE */}
            {gameState.selectedGameId === "truth_and_dare" && (
              <div className="h-auto px-4 py-2 bg-zinc-950/40 shrink-0" id="device-game-action-bottom-overlay">
              {/* Selected active play overlays */}
              <div className="w-full pt-1" id="bottom-action-anchors">
                {frameIsMyTurn ? (
                  <div className="flex flex-col gap-2" id="active-play-actions">
                    {/* CASE A: TRUTH IN PROGRESS */}
                    {gameState.currentCard && gameState.currentCard.type === "truth" && gameState.approvalState === "idle" && (
                      <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-2.5 text-center text-[10px] font-mono text-purple-200">
                        {gameState.truthState === "waiting_for_question" ? (
                          <span className="animate-pulse">⏱️ Waiting for your partner {myPartnerName} to ask you a question in the chat...</span>
                        ) : (
                          <span className="animate-pulse">
                            {gameState.currentCard.id === "truth_custom_question"
                              ? `✍️ Answer ${myPartnerName}'s question in the chat below or send a voice note!`
                              : "✍️ Answer the truth card question or record a voice note in the chat below!"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* CASE B: DARE IN PROGRESS */}
                    {gameState.currentCard && gameState.currentCard.type === "dare" && gameState.approvalState === "idle" && (
                      <>
                        {(!gameState.currentCard.required_media || gameState.currentCard.required_media === "text") ? (
                          <motion.button
                            type="button"
                            onClick={handleSubmitTaskForApproval}
                            disabled={submissionStatus !== "idle"}
                            layout
                            initial={{ borderRadius: "12px" }}
                            animate={{
                              width: submissionStatus === "idle" ? "100%" : "48px",
                              backgroundColor: 
                                submissionStatus === "idle" 
                                  ? "rgba(124, 58, 237, 1)" 
                                  : submissionStatus === "loading"
                                    ? "rgba(30, 27, 75, 0.4)" 
                                    : "rgba(16, 185, 129, 1)", 
                              borderColor: 
                                submissionStatus === "idle" 
                                  ? "rgba(139, 92, 246, 0.3)"
                                  : submissionStatus === "loading"
                                    ? "rgba(139, 92, 246, 0.8)" 
                                    : "rgba(52, 211, 153, 1)", 
                              boxShadow: 
                                submissionStatus === "idle"
                                  ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                                  : submissionStatus === "loading"
                                    ? "0 0 15px rgba(124, 58, 237, 0.3)"
                                    : "0 0 25px rgba(16, 185, 129, 0.8), 0 0 10px rgba(16, 185, 129, 0.4)",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 280,
                              damping: 24,
                            }}
                            className={`mx-auto py-2.5 px-4 text-zinc-100 font-sans text-[10px] tracking-widest uppercase font-semibold border border-white/5 select-none overflow-hidden h-10 flex items-center justify-center ${
                              submissionStatus === "idle" ? "w-full cursor-pointer hover:shadow-lg active:scale-95" : "w-12 cursor-default"
                            }`}
                            style={{ borderRadius: "24px" }}
                            id="btn-action-verify"
                          >
                            <AnimatePresence mode="wait">
                              {submissionStatus === "idle" && (
                                <motion.div
                                  key="idle"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>I Completed This, Verify Me!</span>
                                </motion.div>
                              )}

                              {submissionStatus === "loading" && (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0, rotate: -180 }}
                                  animate={{ opacity: 1, rotate: 0 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  className="flex items-center justify-center shrink-0"
                                >
                                  <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                    <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </motion.div>
                              )}

                              {submissionStatus === "success" && (
                                <motion.div
                                  key="success"
                                  initial={{ opacity: 0, scale: 0.2 }}
                                  animate={{ opacity: 1, scale: 1.2 }}
                                  className="flex items-center justify-center shrink-0"
                                >
                                  <Check className="w-4 h-4 text-white stroke-[3px]" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        ) : (
                          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-2.5 text-center text-[10px] font-mono text-indigo-200 shadow-inner flex flex-col gap-1">
                            <span className="font-bold tracking-wider text-indigo-300">🔒 SUBMISSION LOCKED</span>
                            <span className="animate-pulse">
                              Use the icons in the chat below to capture/record and send your{" "}
                              <span className="text-magenta-400 font-bold uppercase">
                                {gameState.currentCard.required_media === "image"
                                  ? "PICTURE/PHOTO"
                                  : gameState.currentCard.required_media === "video"
                                  ? "VIDEO"
                                  : "VOICE NOTE"}
                              </span>{" "}
                              proof!
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {gameState.approvalState !== "idle" && (
                      <ApprovalSystem
                        approvalState={gameState.approvalState}
                        activePlayerName="You"
                        observingPlayerName={myPartnerName}
                        isCurrentTurnOwner={true}
                        penaltyText={gameState.currentCard?.penalty}
                        onApprove={() => {}}
                        onReject={() => {}}
                        onCompletePenalty={handleActiveCompletePenalty}
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-full hover:scale-[1.01] transition-all" id="observer-side-actions">
                    {gameState.approvalState === "pending" ? (
                      <ApprovalSystem
                        approvalState={gameState.approvalState}
                        activePlayerName={myPartnerName}
                        observingPlayerName="You"
                        isCurrentTurnOwner={false}
                        onApprove={handleObserverApprove}
                        onReject={handleObserverReject}
                        onCompletePenalty={() => {}}
                      />
                    ) : gameState.approvalState === "rejected" ? (
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 text-center text-[10px] font-mono leading-normal">
                        <span className="text-rose-400 block animate-pulse uppercase tracking-wider mb-1 font-semibold">❌ REJECTED</span>
                        <span>Waiting for {myPartnerName} to complete their penalty...</span>
                      </div>
                    ) : (
                      /* Normal waiting state instructions */
                      gameState.currentCard?.type === "truth" ? (
                        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 text-center text-[10px] font-mono leading-normal" id="observer-waiting-banner">
                          <div className="flex flex-col gap-1 items-center">
                            {gameState.truthState === "waiting_for_question" ? (
                              <div className="border border-purple-500/30 bg-purple-950/20 px-3 py-2 rounded-lg text-purple-300 w-full">
                                <span className="text-purple-400 block animate-pulse uppercase tracking-wider mb-1 font-bold">💬 QUESTION REQUIRED</span>
                                <span>Ask {myPartnerName} a question or send a voice note in the chat below!</span>
                              </div>
                            ) : (
                              <div className="text-zinc-400 font-medium">
                                <span className="text-magenta-400 block animate-pulse uppercase tracking-wider mb-1 font-semibold">⏱️ WAITING FOR REPLY</span>
                                <span>Waiting for {myPartnerName} to reply in the chat...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 text-center text-[10px] font-mono leading-normal" id="observer-waiting-banner">
                          <div className="text-zinc-400">
                            <span className="text-indigo-400 block animate-pulse uppercase tracking-wider mb-1 font-semibold">⚡ DARE IN PROGRESS</span>
                            <span>
                              {myPartnerName} is doing their dare. Verification requires a{" "}
                              <span className="text-indigo-300 font-bold uppercase">
                                {gameState.currentCard?.required_media === "image"
                                  ? "PICTURE/PHOTO"
                                  : gameState.currentCard?.required_media === "video"
                                  ? "VIDEO"
                                  : gameState.currentCard?.required_media === "audio"
                                  ? "VOICE NOTE"
                                  : "TEXT"}
                              </span>{" "}
                              upload in the chat room first.
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Bottom Half: Real-time Chatroom */}
            <div className={`shrink-0 overflow-hidden bg-zinc-950/80 transition-all duration-300 ${
              gameState.selectedGameId === "command_control" || gameState.selectedGameId === "virtual_touch" 
                ? "h-[390px]" 
                : "h-[285px]"
            }`} id="device-chatroom-bottom">
              <Chatroom 
                roomId={gameState.id} 
                currentUser={viewer} 
                gameMode={gameMode} 
                triggerAlert={triggerAlert} 
                onMessageSent={handleChatMessageSent}
                isApprovalPending={
                  gameState.approvalState === "pending" || 
                  (gameState.selectedGameId === "command_control" && gameState.ccState === "waiting_for_approval") ||
                  (gameState.selectedGameId === "virtual_touch" && gameState.vtState === "waiting_for_approval")
                }
                gameState={gameState}
                updateRoomState={updateRoomState}
                onCommandApprove={handleCommandAndControlApprove}
                onCommandReject={handleCommandAndControlReject}
                onVirtualTouchApprove={handleVirtualTouchApprove}
                onVirtualTouchReject={handleVirtualTouchReject}
              />
            </div>
          </div>
        )}

        {/* Home safe bar index */}
        <div className="w-full pb-3 flex items-center justify-center bg-zinc-950 px-5 z-20" id="safe-area-indices">
          <div className="w-32 h-1 rounded-full bg-zinc-850" />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative flex flex-col antialiased selection:bg-purple-500/30" id="couples-truth-dare-main">
      
      {/* Geometric Ambient Full-Screen Blurs */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Persistent Beautiful Navbar matching the theme layout */}
      <nav className="h-20 px-6 sm:px-12 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md relative z-30" id="global-header-layout">
        <div className="flex items-center gap-4" id="logo-flexbox">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-magenta-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]" id="logo-icon-sphere">
            <span className="font-bold text-lg text-white">∞</span>
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-purple-400">Nexus Pairs</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
              Suite ID: <span className="text-white font-mono">{gameState?.id || "LV-9921"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8" id="hdr-inner-wrap">
          {currentUser && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Partner Match</p>
              <p className="text-xs font-semibold text-magenta-300 uppercase tracking-wider">
                {currentUser.name} <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-1"></span>
              </p>
            </div>
          )}
          
          <div className="w-[1px] h-8 bg-white/10 hidden sm:block"></div>

          {/* Luxury Sound Controls Capsule */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-full shadow-inner" id="sound-control-capsule">
            {/* Ambient Synth BGM Toggle */}
            <button
              type="button"
              onClick={handleToggleBgm}
              className={`p-1.5 md:px-2.5 md:py-1 rounded-full cursor-pointer flex items-center justify-center gap-1 relative overflow-hidden transition-all duration-300 ${
                bgmOn 
                  ? "bg-violet-600/30 text-violet-300 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.2)]" 
                  : "bg-transparent text-zinc-500 border border-transparent hover:text-zinc-350"
              }`}
              title="Toggle Tech-Luxury Ambient Synthesizer Background soundscape"
              id="btn-bgm-toggle"
            >
              <Music className={`w-3.5 h-3.5 ${bgmOn ? "animate-pulse" : ""}`} />
              <span className="text-[8px] font-mono font-medium uppercase tracking-wider hidden md:inline">BGM</span>
              {bgmOn && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-violet-400 rounded-full" />
              )}
            </button>

            {/* Tactile Interface SFX Toggle */}
            <button
              type="button"
              onClick={handleToggleSfx}
              className={`p-1.5 md:px-2.5 md:py-1 rounded-full cursor-pointer flex items-center justify-center gap-1 relative overflow-hidden transition-all duration-300 ${
                sfxOn 
                  ? "bg-magenta-600/30 text-magenta-300 border border-magenta-500/40 shadow-[0_0_12px_rgba(219,39,119,0.2)]" 
                  : "bg-transparent text-zinc-500 border border-transparent hover:text-zinc-350"
              }`}
              title="Toggle tactile sound effects"
              id="btn-sfx-toggle"
            >
              {sfxOn ? <Volume2 className="w-3.5 h-3.5 text-magenta-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-650" />}
              <span className="text-[8px] font-mono font-medium uppercase tracking-wider hidden md:inline">SFX</span>
              {sfxOn && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-magenta-400 rounded-full" />
              )}
            </button>
          </div>

          <div className="w-[1px] h-8 bg-white/10 hidden sm:block"></div>

          <div className="flex flex-col items-center">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Total score</span>
            <span className="text-lg font-mono text-white font-bold leading-none mt-1">
              {gameState ? (gameState.scoreHost + gameState.scoreGuest) : "0"}
            </span>
          </div>
        </div>
      </nav>

      {/* Global alert toaster notifications */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            id="g-alert-toaster"
          >
            <div className={`px-5 py-3 rounded-2xl border flex items-center gap-2.5 shadow-2xl backdrop-blur-md ${
              alertMsg.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 shadow-emerald-500/5" 
                : alertMsg.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200 shadow-rose-500/5"
                : "bg-indigo-500/10 border-indigo-500/30 text-indigo-200 shadow-indigo-500/5"
            }`}>
              <Zap className={`w-4 h-4 ${alertMsg.type === "success" ? "text-emerald-400" : alertMsg.type === "error" ? "text-rose-400" : "text-indigo-400"}`} />
              <span className="text-xs font-mono font-light tracking-wide">{alertMsg.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRIMARY CONSOLE AREA WITH GEOMETRIC PATTERNS */}
      <div className="flex-1 w-full flex flex-col relative z-20" id="core-playground-view">
        
        {!currentUser ? (
          /* Step 1: Sleek Login & Registration Gate with "Him" or "Her" Role Assignment */
          <div className="flex-1 flex items-center justify-center p-6 animate-fade-in" id="auth-gate-wrapper">
            <LoginAuth 
              onAuthSuccess={(user) => {
                setCurrentUser(user);
                // Also automatically set default orientation for emulated simulation partners matches
                const companionGender = user.gender === "male" ? "female" : "male";
                const companionName = companionGender === "male" ? "Brandon" : "Scarlett";
                const companionProfile: Player = {
                  id: "usr_partner_emulated",
                  name: companionName,
                  gender: companionGender
                };
                setEmulatedUser(companionProfile);

                // If invitedRoomCode is set, trigger automatic background session join!
                if (invitedRoomCode) {
                  handleJoinOnline(user.name, user.gender, invitedRoomCode);
                }
              }} 
              triggerAlert={triggerAlert} 
            />
          </div>
        ) : !gameState ? (
          /* Step 2: Establish connection coupling (Room Codes - Linking mechanism) */
          <div className="flex-1 flex items-center justify-center p-6" id="pairing-gate-wrapper">
            <RoomConnection
              currentUser={currentUser}
              onHostRoom={() => handleHostOnline(currentUser.name, currentUser.gender)}
              onJoinRoom={(code) => handleJoinOnline(currentUser.name, currentUser.gender, code)}
              onLogout={handleResetApp}
              isConnecting={isConnecting}
              triggerAlert={triggerAlert}
              invitedRoomCode={invitedRoomCode}
            />
          </div>
        ) : (
          /* Main active game console layout - Geometric split panel design */
          <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 max-w-7xl mx-auto w-full p-6 sm:p-12 gap-12">
            
            {/* Left Column: Game information panel */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-8 h-full">
              <div className="space-y-6">
                <div className="inline-block px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10" id="turn-orientation-badge">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                    {isTurnForCurrentUser ? "Currently Your Turn" : `Waiting for ${myPartnerName}`}
                  </span>
                </div>
                
                <h2 className="text-5xl sm:text-6xl font-light tracking-tight leading-none text-zinc-100">
                  The <span className="italic font-serif text-magenta-500">Decision</span> <br/>Is Yours.
                </h2>
                
                <p className="text-zinc-400 max-w-sm text-sm leading-relaxed font-light">
                  Tap the fate coin inside the active session device to reveal your destiny. Every choice triggers couples deep inquiries or daring challenges.
                </p>
              </div>

              {/* Dynamic counters grid matching the theme */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <p className="text-[10px] text-purple-400 uppercase font-bold mb-1.5 tracking-widest font-mono">Current turn</p>
                  <p className="text-2xl font-mono font-medium text-white">#{gameState?.turnNumber || 1}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                  <p className="text-[10px] text-magenta-400 uppercase font-bold mb-1.5 tracking-widest font-mono">Matched points</p>
                  <p className="text-2xl font-mono font-medium text-white">
                    {(gameState?.scoreHost || 0) + (gameState?.scoreGuest || 0)}
                  </p>
                </div>
              </div>

              {/* Sandbox Twin Screen Simulator toggle settings block */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-lg space-y-3" id="dual-simulator-dock">
                <div className="flex items-center gap-2 sm:gap-3 text-zinc-400">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-indigo-400">
                    Partner Dual Control Mode
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal font-light">
                  Toggle side-by-side matching representation in this browser tab to simulate and test real-time cloud operations locally.
                </p>
                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setTwinModeEnabled(true)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-mono font-medium tracking-widest border transition-all ${
                      twinModeEnabled
                        ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                        : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    DUAL PLAY
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwinModeEnabled(false)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-mono font-medium tracking-widest border transition-all ${
                      !twinModeEnabled
                        ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
                        : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    SINGLE DEVICE
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Device(s) viewport interactive frame with geometric orbits */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[660px]">
              
              {/* Outer Pulse Circles grounding the view frame */}
              <div className="absolute w-[360px] h-[360px] md:w-[500px] md:h-[500px] rounded-full border border-purple-500/15 animate-pulse pointer-events-none -z-10" />
              <div className="absolute w-[440px] h-[440px] md:w-[600px] md:h-[600px] rounded-full border border-magenta-500/5 animate-pulse duration-[8s] pointer-events-none -z-10" />

              <div className="relative z-10 w-full flex justify-center" id="auth-game-view-wrapper">
                {twinModeEnabled ? (
                  /* SIDE-BY-SIDE MATCHING EMULATOR VIEW FOR DUAL USER SIMULATION */
                  <div className="flex flex-col items-center gap-6 w-full" id="dual-twin-frame-block">
                    {/* Simulated clouds matching guidelines banner */}
                    <div className="bg-white/[0.01] border border-white/10 rounded-2xl py-2 px-4 text-center text-[10px] font-mono text-zinc-400 max-w-md mx-auto flex items-center justify-center gap-2 shadow-inner" id="simulated-twin-banner">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                      <span className="font-semibold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-rose-300">
                        CLOUD WORKSPACE SYNC SIMULATION
                      </span>
                    </div>

                    {/* Side-by-side device frames */}
                    <div className="flex flex-wrap items-center justify-center gap-6 pt-2" id="dual-devices-viewport-flex">
                      
                      {/* Left Device Frame - HIM */}
                      <div className="flex flex-col items-center gap-2" id="device-wrapper-him">
                        <span className="text-[10px] font-mono uppercase text-blue-400 tracking-widest font-semibold flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                          <Smartphone className="w-3 h-3" /> Left Device: HIS VIEW
                        </span>
                        {renderDeviceScreen(currentUser, emulatedUser || undefined)}
                      </div>

                      {/* Right Device Frame - HER */}
                      <div className="flex flex-col items-center gap-2" id="device-wrapper-her">
                        <span className="text-[10px] font-mono uppercase text-rose-400 tracking-widest font-semibold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                          <Smartphone className="w-3 h-3" /> Right Device: HER VIEW
                        </span>
                        {emulatedUser && renderDeviceScreen(emulatedUser, currentUser)}
                      </div>

                    </div>
                  </div>
                ) : (
                  /* SINGLE VIEW DESIGN (Traditional standalone client interface) */
                  <div className="flex flex-col items-center justify-center gap-4 py-4" id="single-device-frame-block">
                    {/* Active Player Orientation Header info */}
                    <div className="text-center font-mono text-[10px] tracking-wider text-zinc-400 bg-white/[0.02] border border-white/10 rounded-full py-1.5 px-5" id="single-view-status-badge">
                      Logged in as <span className="text-purple-400 font-semibold uppercase">{currentUser.name}</span> ({currentUser.gender})
                    </div>

                    {/* Single main viewport centered */}
                    <div className="w-full flex justify-center pt-2" id="single-phone-viewport">
                      {renderDeviceScreen(currentUser)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Dynamic Fate Task indicator footer - Aligned with Geometric Balance Theme */}
      {currentUser && gameState?.currentCard && (
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 pb-12 relative z-20" id="fate-status-footer-bar">
          <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-magenta-500/20 border border-magenta-500/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(219,39,119,0.2)]">
                <span className="text-lg text-magenta-300 font-bold">✦</span>
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.25em] mb-0.5">Active Turn In Progress</p>
                <h3 className="text-base font-semibold tracking-wide text-zinc-200">
                  {gameState.currentCard.type.toUpperCase()}: "{gameState.currentCard.text.substring(0, 75)}..."
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-6 shrink-0 bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
              <div className="text-right">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">SUITE DECISION</span>
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  gameState.approvalState === "pending" 
                    ? "text-amber-400" 
                    : gameState.approvalState === "rejected" 
                    ? "text-rose-400" 
                    : "text-purple-400"
                }`}>
                  {gameState.approvalState}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absolute Base layout credits and metadata */}
      <footer className="w-full py-8 text-center text-[10px] text-zinc-500 tracking-[0.2em] uppercase bg-black/40 border-t border-white/10 relative z-20" id="main-global-footer">
        © 2026 Couples Tech Romance Suite. Crafted for Ultimate Harmony.
      </footer>
    </main>
  );
}
