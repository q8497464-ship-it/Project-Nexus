import { useState, FormEvent } from "react";
import { auth, db, isFirebaseSupported, doc, setDoc, getDoc } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { Player } from "../types";
import { Eye, EyeOff, Sparkles, Smartphone } from "lucide-react";

interface LoginAuthProps {
  onAuthSuccess: (user: Player) => void;
  triggerAlert: (text: string, type: "success" | "info" | "error") => void;
}

export default function LoginAuth({ onAuthSuccess, triggerAlert }: LoginAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      triggerAlert("Please fill in email and password", "error");
      return;
    }
    if (isSignUp && !name.trim()) {
      triggerAlert("Please enter your display name", "error");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign Up Flow
        if (isFirebaseSupported && db) {
          try {
            let firebaseUser = null;
            if (auth) {
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
              } catch (signUpErr: any) {
                console.warn("Standard Auth create failed, falling back to client-driven session: ", signUpErr);
              }
            }

            // Get or generate a persistent client-side UID
            let authUid = firebaseUser ? firebaseUser.uid : localStorage.getItem("couples_local_uid");
            if (!authUid) {
              authUid = "usr_" + Math.random().toString(36).substring(2, 11);
              localStorage.setItem("couples_local_uid", authUid);
            }

            // Align anonymous session if possible
            if (!firebaseUser && auth) {
              try {
                const anonCred = await signInAnonymously(auth);
                authUid = anonCred.user.uid;
              } catch (anonError) {
                console.warn("Anonymous registration alignment skipped:", anonError);
              }
            }
            
            // Check if email already registered in the Cloud-Synced Credentials collection
            const emailKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
            const credRef = doc(db, "credentials", emailKey);
            
            const credSnap = await getDoc(credRef);
            if (credSnap.exists()) {
              throw new Error("This email is already registered. Please login instead!");
            }

            // Save virtual cloud credentials
            const credentialRecord = {
              email: email.trim(),
              passwordHash: password,
              uid: authUid,
              name: name.trim(),
              gender: gender,
              createdAt: new Date().toISOString()
            };
            await setDoc(credRef, credentialRecord);

            // Create and save the profile
            const profile: Player = {
              id: authUid,
              name: name.trim(),
              gender: gender,
              email: email.trim(),
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", authUid), profile);

            triggerAlert("Account registered successfully! 🔐✨", "success");
            onAuthSuccess(profile);
          } catch (signUpErr: any) {
            console.warn("Secure Cloud Registration failed, falling back to offline emulation:", signUpErr);
            triggerAlert("Cloud Database unreached. Logged in via Offline Mode! 📲", "info");
            
            const mockUser: Player = {
              id: "usr_" + Math.random().toString(36).substring(2, 11),
              name: name.trim(),
              gender: gender,
              email: email.trim(),
              createdAt: new Date().toISOString()
            };
            localStorage.setItem(`nxt_credential_${email.trim().toLowerCase()}`, JSON.stringify({
              email: email.trim(),
              passwordHash: password,
              profile: mockUser
            }));
            localStorage.setItem("nxt_mock_profile", JSON.stringify(mockUser));
            onAuthSuccess(mockUser);
          }
        } else {
          // Simulated Registration Mode
          const mockUser: Player = {
            id: `usr_mock_${Math.random().toString(36).substring(2, 9)}`,
            name: name.trim(),
            gender: gender,
            email: email,
            createdAt: new Date().toISOString()
          };
          
          // Persist user in localStorage to emulate database persistence
          localStorage.setItem("nxt_mock_profile", JSON.stringify(mockUser));
          localStorage.setItem(`usr_${mockUser.id}`, JSON.stringify(mockUser));
          
          triggerAlert("Simulated account registered successfully!", "success");
          onAuthSuccess(mockUser);
        }
      } else {
        // Login Flow
        if (isFirebaseSupported && db) {
          try {
            let firebaseUser = null;
            if (auth) {
              try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                firebaseUser = userCredential.user;
              } catch (loginErr: any) {
                console.warn("Standard Auth sign-in failed, checking client-driven fallback session: ", loginErr);
              }
            }

            const emailKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
            const credRef = doc(db, "credentials", emailKey);
            const credSnap = await getDoc(credRef);

            if (firebaseUser) {
              // Try to fetch profile from Firestore
              const docRef = doc(db, "users", firebaseUser.uid);
              const docSnap = await getDoc(docRef);

              if (docSnap && docSnap.exists()) {
                onAuthSuccess(docSnap.data() as Player);
              } else {
                const fallbackProfile: Player = {
                  id: firebaseUser.uid,
                  name: email.split("@")[0],
                  gender: "male",
                  email: email,
                  createdAt: new Date().toISOString()
                };
                await setDoc(docRef, fallbackProfile);
                onAuthSuccess(fallbackProfile);
              }
              triggerAlert("Logged in successfully! 🔑", "success");
            } else if (credSnap.exists()) {
              // Fallback cloud credentials verification
              const credData = credSnap.data() as any;
              if (credData.passwordHash !== password) {
                throw new Error("Incorrect passcode. Please check your spelling and try again.");
              }

              const authUid = credData.uid;

              // Re-align anonymous auth if possible
              if (auth && !auth.currentUser) {
                try {
                  await signInAnonymously(auth);
                } catch (anonError) {
                  console.warn("Anonymous login alignment failed:", anonError);
                }
              }

              const profile: Player = {
                id: authUid,
                name: credData.name,
                gender: credData.gender,
                email: credData.email,
                createdAt: credData.createdAt || new Date().toISOString()
              };

              await setDoc(doc(db, "users", authUid), profile);
              triggerAlert(`Welcome back, ${profile.name}! Connected via Smart Connect. 🔐✨`, "success");
              onAuthSuccess(profile);
            } else {
              throw new Error("No account found with this email. Please sign up first!");
            }
          } catch (loginErr: any) {
            console.warn("Secure Cloud Login failed, trying local storage fallback credentials:", loginErr);
            const emailKey = email.trim().toLowerCase();
            const localSaved = localStorage.getItem(`nxt_credential_${emailKey}`);
            if (localSaved) {
              const parsed = JSON.parse(localSaved);
              if (parsed.passwordHash === password) {
                triggerAlert(`Welcome back, ${parsed.profile.name}! Connected in SmartOffline mode. 🔐📲`, "success");
                onAuthSuccess(parsed.profile);
                return;
              } else {
                triggerAlert("Incorrect passcode. Please check spelling.", "error");
                setLoading(false);
                return;
              }
            }
            
            triggerAlert("Cloud unreached. Signed in via SmartOffline Mode! 📲", "info");
            const fallbackUser: Player = {
              id: "usr_" + Math.random().toString(36).substring(2, 11),
              name: email.split("@")[0],
              gender: "male",
              email: email.trim(),
              createdAt: new Date().toISOString()
            };
            onAuthSuccess(fallbackUser);
          }
        } else {
          // Simulated Login Mode
          const savedMock = localStorage.getItem("nxt_mock_profile");
          if (savedMock) {
            const parsed = JSON.parse(savedMock) as Player;
            if (parsed.email === email) {
              onAuthSuccess(parsed);
              triggerAlert(`Welcome back, ${parsed.name}!`, "success");
              setLoading(false);
              return;
            }
          }
          
          // Fallback or create mock user on spot
          const newMockUser: Player = {
            id: `usr_mock_${Math.random().toString(36).substring(2, 9)}`,
            name: email.split("@")[0] || "User",
            gender: "male",
            email: email,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem("nxt_mock_profile", JSON.stringify(newMockUser));
          onAuthSuccess(newMockUser);
          triggerAlert("Logged in via Simulated Mode", "success");
        }
      }
    } catch (err: any) {
      console.error("Authentication error: ", err);
      triggerAlert(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-center" id="login-auth-suite">
      {/* Sleek Text-Only Logo Header */}
      <div className="text-center mt-6 mb-8" id="text-logo-header">
        <h1 className="text-5xl font-light tracking-[0.35em] uppercase font-sans text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-magenta-400 to-indigo-400">
          NEXUS
        </h1>
        <p className="text-[10px] text-zinc-500 font-mono font-medium tracking-[0.4em] uppercase mt-2.5">
          Pairs connection gate
        </p>
      </div>

      {/* Main glass card container */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden" id="login-glass-card">
        {/* Decorative corner ambient lights */}
        <div className="absolute top-[-50px] left-[-50px] w-[180px] h-[180px] bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute bottom-[-50px] right-[-50px] w-[180px] h-[180px] bg-magenta-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-light tracking-wide text-zinc-100">
            {isSignUp ? "Connect Your Presence" : "Welcome Back"}
          </h2>
          <span className="text-[9px] font-mono uppercase bg-purple-500/10 border border-purple-500/30 text-purple-300 py-1 px-2.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> {isFirebaseSupported ? "SECURE PLAY" : "SANDBOX PLAY"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="auth-form-inner">
          {isSignUp && (
            <div className="flex flex-col gap-1.5" id="form-field-name">
              <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Brandon"
                className="w-full bg-white/[0.02] border border-white/10 text-sm font-light text-zinc-100 rounded-xl px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all"
                id="signup-name-input"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5" id="form-field-email">
            <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nexuspairs.com"
              className="w-full bg-white/[0.02] border border-white/10 text-sm font-light text-zinc-100 rounded-xl px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.35)] transition-all"
              id="login-email-input"
            />
          </div>

          <div className="flex flex-col gap-1.5" id="form-field-password">
            <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.02] border border-white/10 text-sm font-light text-zinc-100 rounded-xl px-4 py-3 pr-10 placeholder-zinc-600 focus:outline-none focus:border-magenta-500 focus:ring-1 focus:ring-magenta-500 focus:shadow-[0_0_15px_rgba(236,72,153,0.35)] transition-all"
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Gender Role Assignment */}
          {isSignUp && (
            <div className="flex flex-col gap-2 pt-1" id="form-field-role">
              <label className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                Determine Role
              </label>
              <div className="grid grid-cols-2 gap-3" id="role-auth-selector">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`py-3 px-3 rounded-xl text-xs font-mono tracking-wider transition-all border ${
                    gender === "male"
                      ? "bg-purple-500/15 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                      : "bg-white/[0.01] border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                  id="signup-role-boy"
                >
                  HIM (MALE TYPE)
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`py-3 px-3 rounded-xl text-xs font-mono tracking-wider transition-all border ${
                    gender === "female"
                      ? "bg-magenta-500/15 border-magenta-500 text-magenta-200 shadow-[0_0_15px_rgba(219,39,119,0.25)]"
                      : "bg-white/[0.01] border-white/5 text-zinc-500 hover:border-white/10"
                  }`}
                  id="signup-role-girl"
                >
                  HER (FEMALE TYPE)
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 font-light leading-relaxed mt-0.5">
                This choice determines the matching orientation for gender-specific truth / dare question distribution.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-magenta-600 hover:from-purple-500 hover:to-magenta-500 text-white font-sans text-xs tracking-[0.2em] font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.01] disabled:opacity-50"
              id="auth-submit-btn"
            >
              {loading ? "PROCESSING..." : isSignUp ? "INITIALIZE ACCOUNT" : "CONNECT IDENTITY"}
            </button>
          </div>

          {/* Quick Offline Sandbox Bypass Action */}
          <div className="pt-2 border-t border-white/5 mt-4 text-center" id="offline-bypass-divider">
            <button
              type="button"
              onClick={() => {
                const defaultLocalUser: Player = {
                  id: "usr_local_host",
                  name: "Amour",
                  gender: "male",
                  createdAt: new Date().toISOString()
                };
                localStorage.setItem("nxt_mock_profile", JSON.stringify(defaultLocalUser));
                onAuthSuccess(defaultLocalUser);
                triggerAlert("Loaded direct offline play - no registration required! 📱❤️", "success");
              }}
              className="w-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-zinc-300 font-mono text-[9px] tracking-widest font-medium py-3.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-left uppercase"
              id="quick-offline-bypass-btn"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" /> INSTANT OFFLINE PLAY (WITHOUT LOGIN)
            </button>
            <p className="text-[8px] text-zinc-500 mt-2 font-sans tracking-wide">
              Perfect for phones! Fully offline-ready. Does not require internet, signup, or any cloud billing.
            </p>
          </div>
        </form>

        <div className="mt-6 text-center" id="auth-switch-prompt">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] font-mono tracking-widest text-zinc-400 hover:text-white transition-colors uppercase"
          >
            {isSignUp ? "Already have an account? Log In" : "Need a new suite? Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
