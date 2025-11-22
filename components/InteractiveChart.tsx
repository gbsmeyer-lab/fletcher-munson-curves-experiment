
import React, { useState, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { curveData, phons, colors } from '../utils/data';
import { playTone, stopTone } from '../utils/audio';
import { Volume2, VolumeX, Activity, BrainCircuit } from 'lucide-react';

interface InteractiveChartProps {
  onPointSelect: (freq: number, db: number, nearestPhon: number) => void;
  isAudioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  probeFreq: number; // Added prop to track the slider frequency
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({ 
  onPointSelect, 
  isAudioEnabled, 
  setAudioEnabled,
  probeFreq
}) => {
  const [hoverData, setHoverData] = useState<{ freq: number; db: number } | null>(null);

  return (
    <div className="w-full h-[400px] relative">
       <div className="absolute top-2 left-12 sm:left-16 z-10 flex items-center space-x-4">
         <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Kurven gleicher Lautheit (ISO 226)</h3>
       </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={curveData}
          // Increased top margin to clear the absolute title
          // Increased bottom margin to ensure "Frequenz (Hz)" label is not blocked
          margin={{ top: 40, right: 20, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="freq" 
            type="number" 
            scale="log" 
            domain={[20, 20000]} 
            tickFormatter={(tick) => tick >= 1000 ? `${tick/1000}k` : tick}
            stroke="#94a3b8"
            label={{ value: 'Frequenz (Hz)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
            allowDataOverflow
            tickMargin={8}
            tick={{fontSize: 12}}
          />
          <YAxis 
            domain={[0, 140]} 
            stroke="#94a3b8"
            label={{ value: 'Schalldruckpegel (dB SPL)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
            tick={{fontSize: 12}}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#cbd5e1' }}
            labelFormatter={(label) => `Freq: ${label} Hz`}
            formatter={(value: number, name: string) => [`${value} dB`, `${name} Phon`]}
          />
          
          {phons.map((phon) => (
            <Line
              key={phon}
              type="monotone"
              dataKey={phon.toString()}
              stroke={colors[phon.toString()]}
              strokeWidth={2.5}
              dot={false}
              activeDot={false}
              animationDuration={1500}
              name={phon.toString()}
            />
          ))}
          
          {/* Dynamic Reference Line tracking the Frequency Slider */}
          <ReferenceLine 
            x={probeFreq} 
            stroke="#cbd5e1" 
            strokeDasharray="5 5" 
            strokeWidth={2}
            label={{ 
                value: `${probeFreq} Hz`, 
                fill: "#cbd5e1", 
                fontSize: 12,
                position: 'insideTopRight',
                offset: 10
            }} 
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InteractiveChart;
