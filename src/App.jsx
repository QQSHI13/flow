import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

function App() {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const totalTime = mode === 'work' ? WORK_TIME : BREAK_TIME;

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

  useEffect(() => {
    setProgress(((totalTime - timeLeft) / totalTime) * 100);
  }, [timeLeft, totalTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = () => {
    setIsRunning(false);
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      animate={{
        background: mode === 'work' 
          ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%)'
          : 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #047857 100%)'
      }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full opacity-10"
            style={{
              background: mode === 'work' 
                ? 'radial-gradient(circle, rgba(147,197,253,0.4) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(167,243,208,0.4) 0%, transparent 70%)',
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div 
        className="absolute top-8 left-0 right-0 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-light tracking-[0.3em] text-white/90 uppercase">
          Flow
        </h1>
        <motion.div 
          className="mt-2 px-4 py-1 rounded-full inline-block backdrop-blur-sm"
          animate={{
            backgroundColor: mode === 'work' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)',
          }}
        >
          <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
            {mode === 'work' ? 'Deep Work' : 'Rest & Recover'}
          </span>
        </motion.div>
      </motion.div>

      {/* Timer Container */}
      <motion.div 
        className="relative flex flex-col items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
      >
        {/* Progress Ring SVG */}
        <div className="relative">
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
            <motion.circle
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>

          {/* Timer Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div 
              className="text-7xl font-light tracking-tight text-white tabular-nums"
              key={timeLeft}
              initial={{ scale: 1.02, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {formatTime(timeLeft)}
            </motion.div>
            <motion.div 
              className="mt-2 text-sm font-medium text-white/50 uppercase tracking-[0.2em]"
              animate={{ opacity: isRunning ? [0.5, 1, 0.5] : 0.5 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
            >
              {isRunning ? (mode === 'work' ? 'Focusing...' : 'Recharging...') : 'Paused'}
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <motion.div 
          className="mt-10 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Reset Button */}
          <motion.button
            onClick={resetTimer}
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>
              <path d="M3 3v9h9"/>
            </svg>
          </motion.button>

          {/* Play/Pause Button */}
          <motion.button
            onClick={toggleTimer}
            className="w-20 h-20 rounded-full flex items-center justify-center bg-white text-gray-900 shadow-2xl shadow-black/30"
            whileHover={{ scale: 1.05, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)" }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>

          {/* Switch Mode Button */}
          <motion.button
            onClick={switchMode}
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </motion.button>
        </motion.div>

        {/* Keyboard Shortcuts Hint */}
        <motion.div 
          className="absolute bottom-8 text-white/30 text-xs tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          SPACE to start • R to reset • M to switch mode
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default App;
