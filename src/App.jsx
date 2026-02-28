import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

function App() {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const totalTime = mode === 'work' ? WORK_TIME : BREAK_TIME;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            const newMode = mode === 'work' ? 'break' : 'work';
            setMode(newMode);
            return newMode === 'work' ? WORK_TIME : BREAK_TIME;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'BUTTON') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.key === 'r' || e.key === 'R') {
        resetTimer();
      } else if (e.key === 'm' || e.key === 'M') {
        switchMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = useCallback(() => setIsRunning(prev => !prev), []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  }, [mode]);

  const switchMode = useCallback(() => {
    setIsRunning(false);
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
  }, [mode]);

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const bgGradient = mode === 'work' 
    ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 30%, #3b82f6 60%, #1e40af 100%)'
    : 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #10b981 60%, #047857 100%)';

  return (
    <div 
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ 
        background: bgGradient,
        transition: 'background 800ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Ambient floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${300 + i * 100}px`,
              height: `${300 + i * 100}px`,
              left: `${10 + i * 20}%`,
              top: `${10 + (i % 2) * 30}%`,
              background: mode === 'work'
                ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 60%)',
              transition: 'background 800ms ease, transform 3s ease-in-out',
              animation: `float ${8 + i * 2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div className="absolute top-6 sm:top-8 left-0 right-0 text-center px-4">
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.3em] text-white/90 uppercase">
          Flow
        </h1>
        <div 
          className="mt-2 px-4 py-1 rounded-full inline-block backdrop-blur-sm transition-colors duration-500"
          style={{
            backgroundColor: mode === 'work' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'
          }}
        >
          <span className="text-xs sm:text-sm font-medium text-white/80 uppercase tracking-wider">
            {mode === 'work' ? 'Deep Work' : 'Rest & Recover'}
          </span>
        </div>
      </div>

      {/* Timer Container */}
      <div className="relative flex flex-col items-center justify-center px-4">
        {/* Progress Ring SVG */}
        <div className="relative" style={{ width: '280px', height: '280px' }}>
          <svg width="280" height="280" className="transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            {/* Progress ring */}
            <circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
            />
          </svg>

          {/* Timer Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div 
              className="text-6xl sm:text-7xl font-light tracking-tight text-white tabular-nums transition-transform duration-150"
              key={timeLeft}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTime(timeLeft)}
            </div>
            <div 
              className="mt-2 text-xs sm:text-sm font-medium text-white/50 uppercase tracking-[0.2em] transition-opacity duration-300"
              style={{ opacity: isRunning ? 1 : 0.5 }}
            >
              {isRunning ? (mode === 'work' ? 'Focusing...' : 'Recharging...') : 'Paused'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 sm:mt-10 flex items-center gap-3 sm:gap-4">
          {/* Reset Button */}
          <button
            onClick={resetTimer}
            tabIndex={0}
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
            aria-label="Reset timer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>
              <path d="M3 3v9h9"/>
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={toggleTimer}
            tabIndex={0}
            className="w-20 h-20 rounded-full flex items-center justify-center bg-white text-gray-900 shadow-2xl shadow-black/30 hover:shadow-black/50 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/50 focus:ring-offset-4 focus:ring-offset-transparent transition-all duration-200"
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            <AnimatePresence mode="wait">
              {isRunning ? (
                <motion.svg
                  key="pause"
                  width="28" height="28" viewBox="0 0 24 24" fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </motion.svg>
              ) : (
                <motion.svg
                  key="play"
                  width="28" height="28" viewBox="0 0 24 24" fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ marginLeft: '4px' }}
                >
                  <polygon points="5,3 19,12 5,21"/>
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          {/* Switch Mode Button */}
          <button
            onClick={switchMode}
            tabIndex={0}
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200"
            aria-label="Switch mode"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 sm:bottom-8 text-white/30 text-xs tracking-wider text-center px-4">
          SPACE to start • R to reset • M to switch mode
        </div>
      </div>
    </div>
  );
}

export default App;
