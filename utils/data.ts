
// Frequencies to plot (standard 1/3 octave bands + extras for smoothness)
const frequencies = [
    20, 31.5, 63, 100, 200, 300, 400, 500, 630, 800, 
    1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 
    10000, 12500, 16000, 20000
  ];
  
  // Approximate dB SPL values for different Phon curves (ISO 226:2003 style)
  // Data format: { freq: number, phon0: number, phon20: number, ... }
  
  export interface CurvePoint {
    freq: number;
    [key: string]: number;
  }
  
  export const curveData: CurvePoint[] = [
    { freq: 20, "0": 74, "20": 88, "40": 104, "60": 118, "80": 130, "100": 141 },
    { freq: 31.5, "0": 58, "20": 74, "40": 90, "60": 106, "80": 120, "100": 132 },
    { freq: 63, "0": 38, "20": 53, "40": 70, "60": 88, "80": 104, "100": 118 },
    { freq: 100, "0": 26, "20": 41, "40": 59, "60": 78, "80": 96, "100": 111 },
    { freq: 200, "0": 14, "20": 30, "40": 49, "60": 69, "80": 88, "100": 105 },
    { freq: 500, "0": 6, "20": 22, "40": 42, "60": 63, "80": 83, "100": 100 },
    { freq: 1000, "0": 3, "20": 20, "40": 40, "60": 60, "80": 80, "100": 100 }, // Reference point
    { freq: 2000, "0": -1, "20": 17, "40": 37, "60": 57, "80": 77, "100": 96 },
    { freq: 3000, "0": -6, "20": 12, "40": 32, "60": 53, "80": 73, "100": 93 }, // Most sensitive area
    { freq: 4000, "0": -4, "20": 14, "40": 34, "60": 55, "80": 75, "100": 95 },
    { freq: 8000, "0": 15, "20": 32, "40": 52, "60": 72, "80": 92, "100": 111 },
    { freq: 12500, "0": 18, "20": 30, "40": 55, "60": 80, "80": 100, "100": 115 }, // Approximation
    { freq: 16000, "0": 50, "20": 65, "40": 85, "60": 105, "80": 120, "100": 135 },
    { freq: 20000, "0": 80, "20": 95, "40": 115, "60": 130, "80": 145, "100": 155 },
  ];
  
  export const phons = [0, 20, 40, 60, 80, 100];
  
  export const colors: Record<string, string> = {
    "0": "#3b82f6",   // Blue 500
    "20": "#06b6d4",  // Cyan 500
    "40": "#10b981",  // Emerald 500
    "60": "#eab308",  // Yellow 500
    "80": "#f97316",  // Orange 500
    "100": "#ef4444", // Red 500
  };

  /**
   * Interpolates the dB value for a specific Phon curve at a specific frequency.
   * Uses Log-Linear interpolation because frequency (X) is logarithmic.
   */
  const interpolateDbForFreqOnPhonCurve = (freq: number, phonKey: string): number => {
    // Find bounding frequencies in the dataset
    const idx = curveData.findIndex(p => p.freq >= freq);
    
    if (idx === -1) return curveData[curveData.length - 1][phonKey]; // Above max
    if (idx === 0) return curveData[0][phonKey]; // Below min

    const p1 = curveData[idx - 1];
    const p2 = curveData[idx];

    // Logarithmic interpolation factor for frequency
    // t = (log(f) - log(f1)) / (log(f2) - log(f1))
    const logF = Math.log10(freq);
    const logF1 = Math.log10(p1.freq);
    const logF2 = Math.log10(p2.freq);

    const t = (logF - logF1) / (logF2 - logF1);
    
    // Map t to the dB value (Linear Y-axis)
    return p1[phonKey] + (p2[phonKey] - p1[phonKey]) * t;
  };

  /**
   * Calculates the required dB SPL to match a target Phon level at a specific frequency.
   */
  export const getDbForFrequencyAndPhon = (freq: number, targetPhon: number): number => {
    // Clamp phon
    const safePhon = Math.max(0, Math.min(100, targetPhon));

    // Find the standard Phon intervals we are between (e.g., 40 and 60)
    const lowerPhon = Math.floor(safePhon / 20) * 20;
    const upperPhon = lowerPhon + 20;
    
    if (lowerPhon === upperPhon) {
        return interpolateDbForFreqOnPhonCurve(freq, lowerPhon.toString());
    }

    // Get dB values at this freq for the bounding Phon curves
    const dbLow = interpolateDbForFreqOnPhonCurve(freq, lowerPhon.toString());
    const dbHigh = interpolateDbForFreqOnPhonCurve(freq, upperPhon.toString());

    // Interpolate between the curves (Phon to dB is roughly linear for small intervals)
    const t = (safePhon - lowerPhon) / 20;
    return dbLow + (dbHigh - dbLow) * t;
  };

  /**
   * Estimates the Phon level for a given frequency and dB SPL.
   */
  export const getPhonForFrequencyAndDb = (freq: number, db: number): number => {
      // Calculate dB for all standard curves at this frequency
      const curveDbs = phons.map(p => ({ 
          phon: p, 
          val: interpolateDbForFreqOnPhonCurve(freq, p.toString()) 
      }));

      // Find where our dB fits
      for (let i = 0; i < curveDbs.length - 1; i++) {
          const low = curveDbs[i];
          const high = curveDbs[i+1];
          
          if (db >= low.val && db <= high.val) {
              // Interpolate phon
              const t = (db - low.val) / (high.val - low.val);
              return low.phon + (high.phon - low.phon) * t;
          }
      }

      // Out of bounds handling
      if (db < curveDbs[0].val) {
          // Extrapolate downwards roughly
          const low = curveDbs[0];
          const diff = low.val - db;
          return Math.max(0, low.phon - diff); // Rough estimate
      }
      
      const last = curveDbs[curveDbs.length - 1];
      return Math.min(120, last.phon + (db - last.val)); // Rough extrapolate up
  };
