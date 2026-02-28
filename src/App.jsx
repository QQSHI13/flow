import { useState, useEffect, useRef, useCallback } from 'react';

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
      // Only trigger if not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setIsRunning(false);
        setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsRunning(false);
        const newMode = mode === 'work' ? 'break' : 'work';
        setMode(newMode);
        setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

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

  // Single blue background as requested
  const backgroundStyle = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0
  };

  return (
    <div style={backgroundStyle}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: 0,
        right: 0,
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: 'clamp(20px, 5vw, 32px)',
          fontWeight: 300,
          letterSpacing: '0.3em',
          color: 'rgba(255,255,255,0.9)',
          textTransform: 'uppercase',
          margin: 0
        }}>
          Flow
        </h1>
        <div style={{
          marginTop: '8px',
          padding: '4px 16px',
          borderRadius: '9999px',
          display: 'inline-block',
          backgroundColor: 'rgba(255,255,255,0.2)'
        }}>
          <span style={{
            fontSize: 'clamp(10px, 2.5vw, 14px)',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            {mode === 'work' ? 'Deep Work' : 'Rest & Recover'}
          </span>
        </div>
      </div>

      {/* Timer Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px'
      }}>
        {/* Progress Ring */}
        <div style={{
          position: 'relative',
          width: 'clamp(200px, 60vw, 280px)',
          height: 'clamp(200px, 60vw, 280px)'
        }}>
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 280 280"
            style={{ transform: 'rotate(-90deg)' }}
          >
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
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: 'clamp(40px, 12vw, 64px)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              color: 'white',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace"
            }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em'
            }}>
              {isRunning ? (mode === 'work' ? 'Focusing...' : 'Recharging...') : 'Paused'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          marginTop: 'clamp(20px, 5vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 2vw, 16px)'
        }}>
          {/* Reset Button */}
          <button
            onClick={resetTimer}
            tabIndex={0}
            type="button"
            style={{
              width: 'clamp(36px, 9vw, 44px)',
              height: 'clamp(36px, 9vw, 44px)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.5)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Reset timer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>
              <path d="M3 3v9h9"/>
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={toggleTimer}
            tabIndex={0}
            type="button"
            style={{
              width: 'clamp(56px, 14vw, 72px)',
              height: 'clamp(56px, 14vw, 72px)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              border: 'none',
              color: '#1f2937',
              cursor: 'pointer',
              boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
              transition: 'all 200ms ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 15px 50px -10px rgba(0, 0, 0, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0, 0, 0, 0.5)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0, 0, 0, 0.5)';
            }}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>

          {/* Switch Mode Button */}
          <button
            onClick={switchMode}
            tabIndex={0}
            type="button"
            style={{
              width: 'clamp(36px, 9vw, 44px)',
              height: 'clamp(36px, 9vw, 44px)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.5)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Switch mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 'clamp(10px, 2.5vw, 12px)',
          letterSpacing: '0.05em',
          padding: '0 16px'
        }}>
          SPACE to start • R to reset • M to switch mode
        </div>
      </div>
    </div>
  );
}

export default App;
