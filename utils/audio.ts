
// Singleton audio context to prevent multiple contexts
let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playTone = (frequency: number, dbSpl: number) => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  // --- GAIN CALCULATION FIX ---
  // Standard acoustic physics: +20dB = 10x Amplitude (Voltage).
  // The Fletcher-Munson effect is massive. 20Hz @ 70dB sounds like 1kHz @ 0dB.
  // We previously used a divisor of 40 which compressed the effect, making it inaudible.
  // We now use the standard divisor of 20.
  
  // REFERENCE LEVEL:
  // We map 120dB SPL to roughly 1.0 (0dBFS) digital gain.
  // This means 60dB SPL will be -60dBFS (0.001 gain).
  // While mathematically correct, -60dBFS is very quiet on consumer laptops.
  // We will apply a 'makeup gain' visually by assuming the user has their system volume up,
  // or we slightly shift the floor.
  
  // Let's map 110dB to 1.0. This gives us headroom for the 120-130dB peaks in the bass
  // while keeping 60dB audible (0.003).
  const REF_DB = 110;
  
  // Formula: Gain = 10 ^ ((TargetDB - ReferenceDB) / 20)
  let targetGain = Math.pow(10, (dbSpl - REF_DB) / 20);

  // Safety Clamping: Prevent blown speakers if math goes wild (e.g. > 130dB)
  // We allow short bursts above 1.0 because we will add a compressor, 
  // but we hard cap at 1.5.
  targetGain = Math.min(targetGain, 1.5);

  const now = audioCtx.currentTime;

  if (!oscillator) {
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    compressorNode = audioCtx.createDynamicsCompressor();

    oscillator.type = 'sine';
    
    // Signal Chain: Osc -> Gain -> Compressor -> Output
    // The compressor helps tame the extreme bass energy if it exceeds digital 0.
    compressorNode.threshold.value = -1; // Start compressing just below clipping
    compressorNode.ratio.value = 12; // Hard limiting
    compressorNode.attack.value = 0.003;
    
    oscillator.connect(gainNode);
    gainNode.connect(compressorNode);
    compressorNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0, now);
    oscillator.start();
  }

  if (oscillator && gainNode) {
    // Use a faster time constant (0.05s) for snappier response to slider movements
    oscillator.frequency.setTargetAtTime(frequency, now, 0.05);
    gainNode.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const stopTone = () => {
  if (gainNode && audioCtx) {
    const now = audioCtx.currentTime;
    gainNode.gain.setTargetAtTime(0, now, 0.1);
  }
};
