/**
 * Web Audio-based luxury ambient synthesizer and interactive sound effects manager
 * Zero external asset dependencies - generates pristine tech-luxury sounds directly in real-time.
 */

class TechLuxurySoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Synthesizer running state
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private bellIntervalId: any = null;

  // Local storage flags
  private bgmEnabled: boolean = false;
  private sfxEnabled: boolean = true;

  constructor() {
    // Load persisted settings
    const storedBgm = localStorage.getItem("couples_bgm_enabled");
    const storedSfx = localStorage.getItem("couples_sfx_enabled");
    
    // Default BGM to false initially to respect browser auto-play policies, but support toggle
    this.bgmEnabled = storedBgm === "true";
    this.sfxEnabled = storedSfx !== "false"; // default to true
  }

  /**
   * Safe lazy initializer for the AudioContext (Must be called on a user interaction)
   */
  private ensureContext(): boolean {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      
      // Setup audio routing tree:
      // Master Gain -> Destination
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // BGM Gain -> Master Gain
      this.bgmGain = this.audioCtx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.25 : 0, this.audioCtx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // SFX Gain -> Master Gain
      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.5 : 0, this.audioCtx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Initialize background synth if BGM is enabled
      if (this.bgmEnabled) {
        this.startAmbientSynth();
      }

      return true;
    } catch (e) {
      console.warn("Web Audio initialization failed:", e);
      return false;
    }
  }

  /**
   * Resumes sound context on user touch/click events
   */
  public resume(): void {
    if (this.ensureContext()) {
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
    }
  }

  /**
   * Starts our procedurally generated luxury warm space drone & pentatonic bell chimes
   */
  private startAmbientSynth() {
    if (!this.audioCtx || !this.bgmGain) return;
    this.stopAmbientSynth();

    try {
      const ctx = this.audioCtx;

      // 1. Create a slow low-pass sweeping filter
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(180, ctx.currentTime);
      // Sweeping filter modulation
      this.filterNode.Q.setValueAtTime(1.5, ctx.currentTime);
      this.filterNode.connect(this.bgmGain);

      // 2. Synthesize deep luxury backing voice (A1 at 55Hz and E2 at 82.4Hz)
      this.droneOsc1 = ctx.createOscillator();
      this.droneOsc1.type = "triangle";
      this.droneOsc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      
      // Slow frequency modulation for organic analog drift
      const driftLfo = ctx.createOscillator();
      const driftGain = ctx.createGain();
      driftLfo.frequency.setValueAtTime(0.08, ctx.currentTime); // extremely slow LFO
      driftGain.gain.setValueAtTime(0.6, ctx.currentTime); // very mild detune drift
      driftLfo.connect(driftGain);
      driftGain.connect(this.droneOsc1.frequency);
      driftLfo.start();

      this.droneOsc2 = ctx.createOscillator();
      this.droneOsc2.type = "sine";
      this.droneOsc2.frequency.setValueAtTime(82.4, ctx.currentTime); // E2 note for rich perfect-fifth chord backing

      // Routing oscillators into filter
      this.droneOsc1.connect(this.filterNode);
      this.droneOsc2.connect(this.filterNode);

      this.droneOsc1.start();
      this.droneOsc2.start();

      // 3. Automated Luxury Celestial Bells (Pentatonic scale A Major / A Minor)
      // Generates gorgeous periodic high-register tech-luxury bell notes
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A4, C#5, E5, A5, C#6, E6
      
      const playRandomBell = () => {
        if (!this.bgmEnabled || !this.audioCtx || !this.bgmGain) return;
        const bellCtx = this.audioCtx;
        const now = bellCtx.currentTime;

        // Choose random octave and note
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        // Custom Bell envelope generator
        const osc = bellCtx.createOscillator();
        const gain = bellCtx.createGain();
        
        // Blend sine and brief triangle for warmth + strike mallet feel
        osc.type = Math.random() > 0.5 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now);

        // Slow frequency vibrato to give a mystical glassy feel (luxurious)
        const vibrato = bellCtx.createOscillator();
        const vibratoGain = bellCtx.createGain();
        vibrato.frequency.setValueAtTime(4.5, now); // 4.5Hz natural vibrato
        vibratoGain.gain.setValueAtTime(2, now); // scale frequency displacement
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start();

        // Exp Decay Gain envelope
        gain.gain.setValueAtTime(0.0, now);
        // Soft strike attack
        gain.gain.linearRampToValueAtTime(0.12, now + 0.15);
        // Rich celestial ring decay
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);

        // Simple Echo sound delay effect
        const delay = bellCtx.createDelay();
        delay.delayTime.setValueAtTime(0.35, now);
        const delayGain = bellCtx.createGain();
        delayGain.gain.setValueAtTime(0.3, now); // delay feedback volume

        osc.connect(gain);
        gain.connect(this.bgmGain);
        
        // Delay loop connection
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.bgmGain);

        osc.start(now);
        osc.stop(now + 5.5);
        vibrato.stop(now + 5.5);
      };

      // Play celestial bell immediately, and then every 6.5s
      playRandomBell();
      this.bellIntervalId = setInterval(playRandomBell, 6500);

    } catch (err) {
      console.warn("Failed to launch ambient synthesizer:", err);
    }
  }

  /**
   * Halts background synthesized voices
   */
  private stopAmbientSynth() {
    if (this.bellIntervalId) {
      clearInterval(this.bellIntervalId);
      this.bellIntervalId = null;
    }

    try {
      if (this.droneOsc1) {
        this.droneOsc1.stop();
        this.droneOsc1.disconnect();
        this.droneOsc1 = null;
      }
      if (this.droneOsc2) {
        this.droneOsc2.stop();
        this.droneOsc2.disconnect();
        this.droneOsc2 = null;
      }
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Toggle background generated ambient music stream
   */
  public toggleBgm(state?: boolean): boolean {
    this.bgmEnabled = state !== undefined ? state : !this.bgmEnabled;
    localStorage.setItem("couples_bgm_enabled", String(this.bgmEnabled));

    if (this.ensureContext() && this.bgmGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      if (this.bgmEnabled) {
        // Ramp up smoothly
        this.bgmGain.gain.setValueAtTime(0.0, now);
        this.bgmGain.gain.linearRampToValueAtTime(0.28, now + 1.2);
        this.startAmbientSynth();
      } else {
        // Ramp down smoothly
        this.bgmGain.gain.linearRampToValueAtTime(0.0, now + 0.8);
        setTimeout(() => this.stopAmbientSynth(), 850);
      }
    }
    return this.bgmEnabled;
  }

  /**
   * Toggle global UI synthesized sound effects
   */
  public toggleSfx(state?: boolean): boolean {
    this.sfxEnabled = state !== undefined ? state : !this.sfxEnabled;
    localStorage.setItem("couples_sfx_enabled", String(this.sfxEnabled));

    if (this.ensureContext() && this.sfxGain && this.audioCtx) {
      const targetVolume = this.sfxEnabled ? 0.5 : 0;
      this.sfxGain.gain.setValueAtTime(targetVolume, this.audioCtx.currentTime);
    }
    return this.sfxEnabled;
  }

  public getBgmStatus(): boolean {
    return this.bgmEnabled;
  }

  public getSfxStatus(): boolean {
    return this.sfxEnabled;
  }

  /**
   * Play high-quality tech luxury synthesized interface sounds
   */
  public play(type: "click" | "success" | "chime" | "flip" | "error" | "ping"): void {
    if (!this.sfxEnabled) return;
    if (!this.ensureContext() || !this.audioCtx || !this.sfxGain) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      switch (type) {
        case "click": {
          // Warm luxury tactile switch click
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "sine";
          // Fast pitch dropping envelope
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.04);
          
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
          
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case "ping": {
          // Glassy crisp telemetry tap
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(980, now);
          osc.frequency.linearRampToValueAtTime(800, now + 0.08);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case "success": {
          // Dual harmonic major major-third rise (D5 -> F#5 -> A5)
          const playNote = (pitch: number, startDelay: number, volume: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(pitch, now + startDelay);
            
            gain.gain.setValueAtTime(0, now + startDelay);
            gain.gain.linearRampToValueAtTime(volume, now + startDelay + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 0.5);
            
            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(now + startDelay);
            osc.stop(now + startDelay + 0.6);
          };

          playNote(587.33, 0.0, 0.12);   // D5
          playNote(739.99, 0.08, 0.12);  // F#5
          playNote(880.00, 0.16, 0.15);  // A5
          break;
        }

        case "chime": {
          // Glissando / glassy modern notification indicator
          const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0, now + idx * 0.05);
            gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.5);
          });
          break;
        }

        case "flip": {
          // Rising audio swoosh sweep simulation (coin action)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const bqp = ctx.createBiquadFilter();
          
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.6);

          bqp.type = "bandpass";
          bqp.frequency.setValueAtTime(250, now);
          bqp.frequency.linearRampToValueAtTime(1800, now + 0.6);
          bqp.Q.setValueAtTime(1.8, now);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.55);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

          osc.connect(bqp);
          bqp.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(now);
          osc.stop(now + 0.65);
          break;
        }

        case "error": {
          // Double buzz warning synthesizer
          const playPulse = (startDelay: number) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.type = "sawtooth";
            osc2.type = "triangle";
            
            // detuned minor second dissonance
            osc1.frequency.setValueAtTime(140, now + startDelay);
            osc2.frequency.setValueAtTime(141.5, now + startDelay);

            // low frequency filter for analog luxury buzz rather than harsh chirp
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = "lowpass";
            lowpass.frequency.setValueAtTime(260, now);

            gain.gain.setValueAtTime(0, now + startDelay);
            gain.gain.linearRampToValueAtTime(0.15, now + startDelay + 0.02);
            gain.gain.linearRampToValueAtTime(0.001, now + startDelay + 0.15);

            osc1.connect(lowpass);
            osc2.connect(lowpass);
            lowpass.connect(gain);
            gain.connect(this.sfxGain!);

            osc1.start(now + startDelay);
            osc2.start(now + startDelay);
            osc1.stop(now + startDelay + 0.2);
            osc2.stop(now + startDelay + 0.2);
          };

          playPulse(0.0);
          playPulse(0.1);
          break;
        }
      }
    } catch (e) {
      console.warn("Unable to trigger synthesizer SFX:", e);
    }
  }
}

export const soundManager = new TechLuxurySoundManager();
