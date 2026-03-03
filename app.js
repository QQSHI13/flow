/**
 * Flow - Pomodoro Timer
 * A clean, modular vanilla JS implementation
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SESSIONS_BEFORE_LONG_BREAK: 4,
    DEFAULTS: {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cookiesEnabled: true,
        soundEnabled: true
    },
    STATE_SAVE_INTERVAL: 10000 // ms
};

// ============================================
// STATE
// ============================================
const state = {
    mode: 'work', // 'work' | 'shortBreak' | 'longBreak'
    timeLeft: CONFIG.DEFAULTS.workMinutes * 60,
    isRunning: false,
    workSessionsCompleted: 0,
    timerInterval: null,
    wakeLock: null,
    audioCtx: null,
    
    // Custom settings
    customWorkMinutes: CONFIG.DEFAULTS.workMinutes,
    customShortBreakMinutes: CONFIG.DEFAULTS.shortBreakMinutes,
    customLongBreakMinutes: CONFIG.DEFAULTS.longBreakMinutes,
    cookiesEnabled: CONFIG.DEFAULTS.cookiesEnabled,
    soundEnabled: CONFIG.DEFAULTS.soundEnabled
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    // Main UI
    app: document.getElementById('app'),
    badge: document.getElementById('badge'),
    clock: document.getElementById('clock'),
    timerTime: document.getElementById('timer-time'),
    timerStatus: document.getElementById('timer-status'),
    progressCircle: document.getElementById('progress'),
    
    // Controls
    playBtn: document.getElementById('play-btn'),
    resetBtn: document.getElementById('reset-btn'),
    modeBtn: document.getElementById('mode-btn'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    
    // Settings
    settingsModal: document.getElementById('settings-modal'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsClose: document.getElementById('settings-close'),
    settingsReset: document.getElementById('settings-reset'),
    workMinutesInput: document.getElementById('work-minutes'),
    shortBreakMinutesInput: document.getElementById('short-break-minutes'),
    longBreakMinutesInput: document.getElementById('long-break-minutes'),
    cookieToggle: document.getElementById('cookie-toggle'),
    soundToggle: document.getElementById('sound-toggle')
};

// ============================================
// UTILITIES
// ============================================
const utils = {
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },
    
    detectMobile() {
        // UA-CH API - returns true for phones (Chrome/Edge)
        return navigator.userAgentData?.mobile === true;
    },
    
    animateButton(btn) {
        btn.classList.remove('key-pressed');
        void btn.offsetWidth; // Force reflow
        btn.classList.add('key-pressed');
        setTimeout(() => btn.classList.remove('key-pressed'), 300);
    }
};

// ============================================
// COOKIES
// ============================================
const cookies = {
    set(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
    },
    
    get(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (const c of ca) {
            const trimmed = c.trim();
            if (trimmed.startsWith(nameEQ)) {
                return decodeURIComponent(trimmed.substring(nameEQ.length));
            }
        }
        return null;
    },
    
    delete(name) {
        this.set(name, '', -1);
    }
};

// ============================================
// AUDIO
// ============================================
const audio = {
    getContext() {
        if (!state.audioCtx) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (browser autoplay policy)
        if (state.audioCtx.state === 'suspended') {
            state.audioCtx.resume();
        }
        return state.audioCtx;
    },
    
    play(soundType = 'default') {
        if (!state.soundEnabled) return;
        
        const ctx = this.getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        switch (soundType) {
            case 'workEnd':
                // Triumphant ascending major chord (C5-E5-G5)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
                oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.8);
                break;
                
            case 'breakEnd':
                // Gentle descending pattern (G5-E5-C5)
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(783.99, ctx.currentTime);
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.8);
                break;
                
            default:
                // Pleasant chime
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.5);
        }
    }
};

// ============================================
// WAKE LOCK
// ============================================
const wakeLockManager = {
    async request() {
        if (!('wakeLock' in navigator)) return;
        try {
            state.wakeLock = await navigator.wakeLock.request('screen');
            state.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        } catch (err) {
            console.log('Wake Lock failed:', err);
        }
    },
    
    release() {
        if (state.wakeLock) {
            state.wakeLock.release();
            state.wakeLock = null;
        }
    }
};

// ============================================
// FULLSCREEN
// ============================================
const fullscreen = {
    toggle() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                console.log('Fullscreen not supported');
            });
            document.body.classList.add('is-fullscreen');
        } else {
            document.exitFullscreen();
            document.body.classList.remove('is-fullscreen');
        }
    },
    
    init() {
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                document.body.classList.remove('is-fullscreen');
            }
        });
    }
};

// ============================================
// TIMER LOGIC
// ============================================
const timer = {
    getTotalTime() {
        switch (state.mode) {
            case 'work': return state.customWorkMinutes * 60;
            case 'shortBreak': return state.customShortBreakMinutes * 60;
            case 'longBreak': return state.customLongBreakMinutes * 60;
            default: return state.customWorkMinutes * 60;
        }
    },
    
    tick() {
        if (state.timeLeft <= 1) {
            this.onComplete();
        } else {
            state.timeLeft--;
        }
        ui.update();
        persistence.saveState();
    },
    
    onComplete() {
        const soundType = state.mode === 'work' ? 'workEnd' : 'breakEnd';
        audio.play(soundType);
        
        if (state.mode === 'work') {
            state.workSessionsCompleted++;
            if (state.workSessionsCompleted % CONFIG.SESSIONS_BEFORE_LONG_BREAK === 0) {
                state.mode = 'longBreak';
                state.timeLeft = state.customLongBreakMinutes * 60;
            } else {
                state.mode = 'shortBreak';
                state.timeLeft = state.customShortBreakMinutes * 60;
            }
        } else {
            state.mode = 'work';
            state.timeLeft = state.customWorkMinutes * 60;
        }
    },
    
    toggle() {
        if (state.isRunning) {
            this.pause();
        } else {
            this.start();
        }
        ui.update();
    },
    
    start() {
        state.isRunning = true;
        persistence.saveState();
        wakeLockManager.request();
        state.timerInterval = setInterval(() => this.tick(), 1000);
    },
    
    pause() {
        state.isRunning = false;
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        persistence.saveState();
        wakeLockManager.release();
    },
    
    reset() {
        this.pause();
        state.timeLeft = this.getTotalTime();
        persistence.saveState();
        ui.update();
    },
    
    switchMode() {
        this.pause();
        audio.play();
        
        const modes = ['work', 'shortBreak', 'longBreak'];
        const currentIndex = modes.indexOf(state.mode);
        state.mode = modes[(currentIndex + 1) % modes.length];
        state.timeLeft = this.getTotalTime();
        
        persistence.saveState();
        ui.update();
    },
    
    resumeFromLoadedState() {
        if (state.isRunning) {
            wakeLockManager.request();
            state.timerInterval = setInterval(() => this.tick(), 1000);
            persistence.saveState(); // Update timestamp
        }
    }
};

// ============================================
// UI UPDATES
// ============================================
const ui = {
    update() {
        const totalTime = timer.getTotalTime();
        const progress = ((totalTime - state.timeLeft) / totalTime) * 100;
        const circumference = 2 * Math.PI * 120;
        const offset = circumference - (progress / 100) * circumference;
        
        // Update timer display
        elements.timerTime.textContent = utils.formatTime(state.timeLeft);
        elements.progressCircle.style.strokeDashoffset = offset;
        
        // Update status text
        if (state.isRunning) {
            elements.timerStatus.textContent = {
                work: 'Focusing...',
                shortBreak: 'Short Break',
                longBreak: 'Long Break'
            }[state.mode];
        } else {
            elements.timerStatus.textContent = 'Paused';
        }
        
        // Update badge
        this.updateBadge();
        
        // Update play/pause icons
        elements.iconPlay.style.display = state.isRunning ? 'none' : 'block';
        elements.iconPause.style.display = state.isRunning ? 'block' : 'none';
    },
    
    updateBadge() {
        const badgeClass = {
            work: 'mode-work',
            shortBreak: 'mode-short-break',
            longBreak: 'mode-long-break'
        }[state.mode];
        
        elements.badge.className = badgeClass;
        
        if (state.mode === 'work') {
            elements.badge.textContent = state.isRunning 
                ? `Deep Work ${state.workSessionsCompleted % CONFIG.SESSIONS_BEFORE_LONG_BREAK + 1}/${CONFIG.SESSIONS_BEFORE_LONG_BREAK}`
                : 'Deep Work';
        } else if (state.mode === 'shortBreak') {
            elements.badge.textContent = 'Short Rest';
        } else {
            elements.badge.textContent = 'Long Rest';
        }
    },
    
    updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        elements.clock.textContent = `${h}:${m}`;
    },
    
    initClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }
};

// ============================================
// SETTINGS
// ============================================
const settings = {
    open() {
        elements.workMinutesInput.value = state.customWorkMinutes;
        elements.shortBreakMinutesInput.value = state.customShortBreakMinutes;
        elements.longBreakMinutesInput.value = state.customLongBreakMinutes;
        
        this.updateToggleUI(elements.cookieToggle, state.cookiesEnabled);
        this.updateToggleUI(elements.soundToggle, state.soundEnabled);
        
        elements.settingsModal.classList.add('active');
    },
    
    close() {
        this.save();
        elements.settingsModal.classList.remove('active');
    },
    
    updateToggleUI(container, isActive) {
        const toggle = container.querySelector('.toggle-switch');
        toggle.classList.toggle('active', isActive);
    },
    
    getToggleState(container) {
        return container.querySelector('.toggle-switch').classList.contains('active');
    },
    
    save() {
        state.customWorkMinutes = parseInt(elements.workMinutesInput.value) || 25;
        state.customShortBreakMinutes = parseInt(elements.shortBreakMinutesInput.value) || 5;
        state.customLongBreakMinutes = parseInt(elements.longBreakMinutesInput.value) || 15;
        state.cookiesEnabled = this.getToggleState(elements.cookieToggle);
        state.soundEnabled = this.getToggleState(elements.soundToggle);
        
        // Save to cookie
        if (state.cookiesEnabled) {
            persistence.saveSettings();
        }
        
        // Update timer if paused
        if (!state.isRunning) {
            state.timeLeft = timer.getTotalTime();
            ui.update();
        }
    },
    
    reset() {
        if (!confirm('Reset all settings to default? This will also clear saved state.')) return;
        
        // Reset state
        Object.assign(state, {
            customWorkMinutes: CONFIG.DEFAULTS.workMinutes,
            customShortBreakMinutes: CONFIG.DEFAULTS.shortBreakMinutes,
            customLongBreakMinutes: CONFIG.DEFAULTS.longBreakMinutes,
            cookiesEnabled: CONFIG.DEFAULTS.cookiesEnabled,
            soundEnabled: CONFIG.DEFAULTS.soundEnabled,
            mode: 'work',
            timeLeft: CONFIG.DEFAULTS.workMinutes * 60,
            isRunning: false,
            workSessionsCompleted: 0
        });
        
        // Clear cookies
        persistence.clearAll();
        
        // Clear timer
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        wakeLockManager.release();
        
        // Update UI
        elements.workMinutesInput.value = state.customWorkMinutes;
        elements.shortBreakMinutesInput.value = state.customShortBreakMinutes;
        elements.longBreakMinutesInput.value = state.customLongBreakMinutes;
        this.updateToggleUI(elements.cookieToggle, true);
        this.updateToggleUI(elements.soundToggle, true);
        ui.update();
        
        alert('Settings reset to defaults!');
    },
    
    toggleCookie() {
        const toggle = elements.cookieToggle.querySelector('.toggle-switch');
        toggle.classList.toggle('active');
        this.save();
    },
    
    toggleSound() {
        const toggle = elements.soundToggle.querySelector('.toggle-switch');
        toggle.classList.toggle('active');
        this.save();
    },
    
    init() {
        elements.settingsBtn.addEventListener('click', () => this.open());
        elements.settingsClose.addEventListener('click', () => this.close());
        elements.settingsReset.addEventListener('click', () => this.reset());
        
        elements.cookieToggle.addEventListener('click', () => this.toggleCookie());
        elements.soundToggle.addEventListener('click', () => this.toggleSound());
        
        // Auto-save on input change
        elements.workMinutesInput.addEventListener('change', () => this.save());
        elements.shortBreakMinutesInput.addEventListener('change', () => this.save());
        elements.longBreakMinutesInput.addEventListener('change', () => this.save());
        
        // Close on backdrop click
        elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) this.close();
        });
    }
};

// ============================================
// PERSISTENCE
// ============================================
const persistence = {
    saveSettings() {
        const settings = {
            workMinutes: state.customWorkMinutes,
            shortBreakMinutes: state.customShortBreakMinutes,
            longBreakMinutes: state.customLongBreakMinutes,
            cookiesEnabled: state.cookiesEnabled,
            soundEnabled: state.soundEnabled
        };
        cookies.set('flowSettings', JSON.stringify(settings), 365);
    },
    
    loadSettings() {
        const saved = cookies.get('flowSettings');
        if (!saved) return;
        
        try {
            const settings = JSON.parse(saved);
            state.customWorkMinutes = settings.workMinutes ?? CONFIG.DEFAULTS.workMinutes;
            state.customShortBreakMinutes = settings.shortBreakMinutes ?? CONFIG.DEFAULTS.shortBreakMinutes;
            state.customLongBreakMinutes = settings.longBreakMinutes ?? CONFIG.DEFAULTS.longBreakMinutes;
            state.cookiesEnabled = settings.cookiesEnabled ?? CONFIG.DEFAULTS.cookiesEnabled;
            state.soundEnabled = settings.soundEnabled ?? CONFIG.DEFAULTS.soundEnabled;
        } catch (e) {
            console.log('Failed to load settings:', e);
        }
    },
    
    saveState() {
        if (!state.cookiesEnabled) return;
        
        const stateData = {
            mode: state.mode,
            timeLeft: state.timeLeft,
            isRunning: state.isRunning,
            workSessionsCompleted: state.workSessionsCompleted,
            timestamp: Date.now()
        };
        cookies.set('flowState', JSON.stringify(stateData), 30);
    },
    
    loadState() {
        const saved = cookies.get('flowState');
        if (!saved) return false;
        
        try {
            const savedState = JSON.parse(saved);
            const now = Date.now();
            const elapsed = Math.floor((now - savedState.timestamp) / 1000);
            
            state.mode = savedState.mode || 'work';
            state.workSessionsCompleted = savedState.workSessionsCompleted || 0;
            
            if (savedState.isRunning) {
                state.timeLeft = Math.max(0, savedState.timeLeft - elapsed);
                
                if (state.timeLeft <= 0) {
                    // Timer expired while away
                    if (state.mode === 'work') {
                        state.workSessionsCompleted++;
                        if (state.workSessionsCompleted % CONFIG.SESSIONS_BEFORE_LONG_BREAK === 0) {
                            state.mode = 'longBreak';
                            state.timeLeft = state.customLongBreakMinutes * 60;
                        } else {
                            state.mode = 'shortBreak';
                            state.timeLeft = state.customShortBreakMinutes * 60;
                        }
                    } else {
                        state.mode = 'work';
                        state.timeLeft = state.customWorkMinutes * 60;
                    }
                    state.isRunning = false;
                } else {
                    state.isRunning = true;
                }
            } else {
                state.timeLeft = savedState.timeLeft;
                state.isRunning = false;
            }
            
            return true;
        } catch (e) {
            console.log('Failed to load state:', e);
            return false;
        }
    },
    
    clearAll() {
        cookies.delete('flowSettings');
        cookies.delete('flowState');
    },
    
    initAutoSave() {
        // Save before unload
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Periodic save while running
        setInterval(() => {
            if (state.isRunning && state.cookiesEnabled) {
                this.saveState();
            }
        }, CONFIG.STATE_SAVE_INTERVAL);
    }
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
const keyboard = {
    init() {
        document.addEventListener('keydown', (e) => {
            // Skip on mobile
            if (document.body.classList.contains('is-mobile')) return;
            
            // Skip if Ctrl/Cmd pressed (browser shortcuts)
            if (e.ctrlKey || e.metaKey) return;
            
            // Skip if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key) {
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    timer.toggle();
                    utils.animateButton(elements.playBtn);
                    break;
                    
                case 'r':
                case 'R':
                    if (state.isRunning) {
                        timer.reset();
                        utils.animateButton(elements.resetBtn);
                    } else {
                        timer.switchMode();
                        utils.animateButton(elements.modeBtn);
                    }
                    break;
                    
                case 'f':
                case 'F':
                    fullscreen.toggle();
                    break;
            }
        });
    }
};

// ============================================
// DOUBLE-TAP FULLSCREEN (Mobile)
// ============================================
const doubleTapFullscreen = {
    lastTouchTime: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    
    init() {
        document.addEventListener('touchstart', (e) => {
            // Only on mobile
            if (!document.body.classList.contains('is-mobile')) return;
            
            // Skip if touching interactive elements
            if (e.target.closest('.ctrl') || 
                e.target.closest('#settings-btn') || 
                e.target.closest('#settings-content')) {
                return;
            }
            
            const currentTime = Date.now();
            const tapGap = currentTime - this.lastTouchTime;
            const touch = e.touches[0];
            const distance = Math.hypot(
                touch.clientX - this.lastTouchX,
                touch.clientY - this.lastTouchY
            );
            
            if (tapGap < 400 && tapGap > 50 && distance < 50) {
                e.preventDefault();
                fullscreen.toggle();
                this.lastTouchTime = 0;
            } else {
                this.lastTouchTime = currentTime;
                this.lastTouchX = touch.clientX;
                this.lastTouchY = touch.clientY;
            }
        }, { passive: false });
    }
};

// ============================================
// SERVICE WORKER REGISTRATION (PWA)
// ============================================
const serviceWorker = {
    init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    // Apply mobile class if needed
    if (utils.detectMobile()) {
        document.body.classList.add('is-mobile');
    }
    
    // Load saved data
    persistence.loadSettings();
    
    // Set initial time based on settings
    state.timeLeft = timer.getTotalTime();
    
    // Load saved state (will override timeLeft if exists)
    const stateLoaded = persistence.loadState();
    if (!stateLoaded) {
        state.timeLeft = state.customWorkMinutes * 60;
    }
    
    // Initialize UI
    ui.initClock();
    ui.update();
    
    // Initialize modules
    settings.init();
    keyboard.init();
    fullscreen.init();
    doubleTapFullscreen.init();
    persistence.initAutoSave();
    serviceWorker.init();
    
    // Event listeners for controls
    elements.playBtn.addEventListener('click', () => timer.toggle());
    elements.resetBtn.addEventListener('click', () => timer.reset());
    elements.modeBtn.addEventListener('click', () => timer.switchMode());
    
    // Resume timer if it was running
    timer.resumeFromLoadedState();
}

// Start the app
init();
