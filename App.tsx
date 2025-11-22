import React, { useState, useEffect } from 'react';
import InteractiveChart from './components/InteractiveChart';
import { playTone, stopTone } from './utils/audio';
import { getDbForFrequencyAndPhon, getPhonForFrequencyAndDb } from './utils/data';
import { Play, Pause, Activity, Lock, Unlock } from 'lucide-react';

const App: React.FC = () => {
  // State for the "Probe" - the user's current test point
  const [probeFreq, setProbeFreq] = useState<number>(1000);
  const [probeDB, setProbeDB] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Equal Loudness Mode State
  const [isEqualLoudnessMode, setIsEqualLoudnessMode] = useState<boolean>(false);
  const [targetPhon, setTargetPhon] = useState<number>(60);
  
  // Store the dB level before entering mode to restore it later
  const [savedDbLevel, setSavedDbLevel] = useState<number>(60);

  // Audio Effect
  useEffect(() => {
    if (isPlaying) {
      playTone(probeFreq, probeDB);
    } else {
      stopTone();
    }
  }, [isPlaying, probeFreq, probeDB]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopTone();
  }, []);

  // Handler for Frequency Change
  const handleFreqChange = (newFreq: number) => {
    setProbeFreq(newFreq);
    
    if (isEqualLoudnessMode) {
        // If mode is active, automatically adjust dB to match the locked Phon level
        const newDb = getDbForFrequencyAndPhon(newFreq, targetPhon);
        setProbeDB(Math.round(newDb * 10) / 10); // Round for UI cleanliness
    } else {
        // If mode is inactive, changing freq might change the perceived Phon. 
        // We update the targetPhon to match where we landed, so if they enable the mode next, it starts smooth.
        const currentPhon = getPhonForFrequencyAndDb(newFreq, probeDB);
        setTargetPhon(currentPhon);
    }
  };

  // Handler for dB Change
  const handleDbChange = (newDb: number) => {
    setProbeDB(newDb);
    
    // When manually changing volume, we always update the Target Phon
    // This effectively "shifts" the curve we are locked to.
    const newPhon = getPhonForFrequencyAndDb(probeFreq, newDb);
    setTargetPhon(newPhon);
  };

  // Handler for toggling mode
  const toggleEqualLoudness = () => {
      if (!isEqualLoudnessMode) {
          // Enabling: 
          // 1. Save current level so we can return to it.
          setSavedDbLevel(probeDB);
          
          // 2. Determine the Target Phon based on the Reference (1kHz) level of the current slider.
          const referencePhon = getPhonForFrequencyAndDb(1000, probeDB);
          setTargetPhon(referencePhon);

          // 3. Immediately apply the jump to the current frequency
          const newDb = getDbForFrequencyAndPhon(probeFreq, referencePhon);
          setProbeDB(Math.round(newDb * 10) / 10);
      } else {
          // Disabling:
          // 1. Restore the saved level
          setProbeDB(savedDbLevel);
          
          // 2. Update internal phon state to match the restored level
          const restoredPhon = getPhonForFrequencyAndDb(probeFreq, savedDbLevel);
          setTargetPhon(restoredPhon);
      }
      setIsEqualLoudnessMode(!isEqualLoudnessMode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden pb-10">
      {/* Header with embedded controls */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20 shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent leading-tight">
                Kurven gleicher Lautheit
              </h1>
              <p className="text-xs text-slate-400">die Fletcher-Munson-Kurven</p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`touch-manipulation px-4 py-3 md:py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 min-w-[110px] ${
                  isPlaying 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50' 
                    : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {isPlaying ? <><Pause className="w-4 h-4" /> STOPP</> : <><Play className="w-4 h-4" /> TON AN</>}
              </button>

              <button
                onClick={toggleEqualLoudness}
                className={`touch-manipulation px-4 py-3 md:py-2 rounded-full border flex items-center justify-center gap-2 transition-all duration-200 min-w-[160px] ${
                    isEqualLoudnessMode 
                    ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                }`}
              >
                {isEqualLoudnessMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="text-sm font-medium">Gleiche Lautheit</span>
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        
        {/* Unified Card Container */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
            
            {/* Chart Section */}
            <div className="touch-pan-x touch-pan-y pt-4 px-2 sm:px-4">
            <InteractiveChart 
                onPointSelect={(f, d) => {
                    handleFreqChange(f);
                    handleDbChange(d);
                }}
                isAudioEnabled={isPlaying}
                setAudioEnabled={setIsPlaying}
                probeFreq={probeFreq}
            />
            </div>

            {/* Controls Section - Embedded below chart */}
            <div className="bg-slate-900/80 border-t border-slate-800 px-6 py-5 shadow-[inset_0_10px_30px_-10px_rgba(0,0,0,0.5)]">
                <div className="space-y-5 max-w-3xl mx-auto">
                {/* Frequency Slider - Logarithmic Scale */}
                <div>
                    <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="text-slate-300">Frequenz (Hz)</span>
                    <span className="font-mono text-blue-400 text-lg">{probeFreq} Hz</span>
                    </div>
                    <div className="relative h-8 flex items-center">
                        <input
                        type="range"
                        min={Math.log10(20)}
                        max={Math.log10(20000)}
                        step="0.01"
                        value={Math.log10(probeFreq)}
                        onChange={(e) => handleFreqChange(Math.round(Math.pow(10, Number(e.target.value))))}
                        className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 touch-none"
                        />
                    </div>
                    <div className="relative w-full h-4 mt-0.5 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    <span className="absolute left-0 -translate-x-0">20</span>
                    <span className="absolute left-[23.3%] -translate-x-1/2">100</span>
                    <span className="absolute left-[56.6%] -translate-x-1/2">1k</span>
                    <span className="absolute left-[90%] -translate-x-1/2">10k</span>
                    <span className="absolute right-0 translate-x-0">20k</span>
                    </div>
                </div>

                {/* dB Slider */}
                <div>
                    <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className="text-slate-300 flex items-center gap-2">
                        Schalldruckpegel (dB SPL)
                        {isEqualLoudnessMode && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold">AUTO</span>}
                    </span>
                    <div className="text-right">
                        <span className={`block font-mono text-lg ${isEqualLoudnessMode ? 'text-indigo-300' : 'text-orange-300'}`}>
                            {probeDB.toFixed(1)} dB
                        </span>
                    </div>
                    </div>
                    <div className="relative h-8 flex items-center">
                        <input
                        type="range"
                        min="0"
                        max="130"
                        step="0.5"
                        value={probeDB}
                        onChange={(e) => handleDbChange(Number(e.target.value))}
                        disabled={isEqualLoudnessMode} 
                        className={`w-full h-4 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 touch-none ${
                            isEqualLoudnessMode 
                            ? 'bg-indigo-900/50 accent-indigo-500 hover:accent-indigo-400 focus:ring-indigo-500/50' 
                            : 'bg-slate-700 accent-orange-500 hover:accent-orange-400 focus:ring-orange-500/50'
                        }`}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-medium uppercase tracking-wider">
                    <span>0 dB</span>
                    <span>65 dB</span>
                    <span>130 dB</span>
                    </div>
                </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;