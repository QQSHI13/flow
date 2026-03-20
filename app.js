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
        soundEnabled: true,
        autoStartBreak: false,
        theme: 'dark'
    },
    STATE_SAVE_INTERVAL: 10000, // ms
    TIMER_TICK_INTERVAL: 100 // ms (for accuracy)
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
    clockInterval: null,
    wakeLock: null,
    audioCtx: null,
    startTime: null, // For accurate timing
    remainingAtStart: 0, // For accurate timing
    
    // Custom settings
    customWorkMinutes: CONFIG.DEFAULTS.workMinutes,
    customShortBreakMinutes: CONFIG.DEFAULTS.shortBreakMinutes,
    customLongBreakMinutes: CONFIG.DEFAULTS.longBreakMinutes,
    soundEnabled: CONFIG.DEFAULTS.soundEnabled,
    autoStartBreak: CONFIG.DEFAULTS.autoStartBreak,
    theme: CONFIG.DEFAULTS.theme,
    
    // Task/Session tracking
    currentTask: '',
    sessionHistory: []
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
    soundToggle: document.getElementById('sound-toggle'),
    autoStartBreakToggle: document.getElementById('auto-start-break-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    themeLabel: document.getElementById('theme-label'),
    
    // Task tracking
    taskInput: document.getElementById('task-input'),
    
    // Stats
    statsSection: document.getElementById('stats-section'),
    todaySessions: document.getElementById('today-sessions'),
    todayFocusTime: document.getElementById('today-focus-time')
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
    
    formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) {
            return `${h}h ${m}m`;
        }
        return `${m}m`;
    },
    
    detectMobile() {
        // UA-CH API - returns true for phones (Chrome/Edge)
        // Fallback to user agent sniffing for other browsers
        return navigator.userAgentData?.mobile === true || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    animateButton(btn) {
        btn.classList.remove('key-pressed');
        void btn.offsetWidth; // Force reflow
        btn.classList.add('key-pressed');
        setTimeout(() => btn.classList.remove('key-pressed'), 300);
    },
    
    // Input validation
    validateMinutes(value, min = 1, max = 120) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < min) return min;
        if (num > max) return max;
        return num;
    },
    
    // Get today's date string
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }
};

// ============================================
// LOCALSTORAGE (Migrated from cookies)
// ============================================
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(`flow_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('localStorage set error:', e);
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(`flow_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('localStorage get error:', e);
            return null;
        }
    },
    
    delete(key) {
        try {
            localStorage.removeItem(`flow_${key}`);
        } catch (e) {
            console.error('localStorage delete error:', e);
        }
    }
};

// ============================================
// NOTIFICATIONS API
// ============================================
const notifications = {
    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },
    
    send(title, options = {}) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        
        try {
            new Notification(title, {
                icon: 'icon-192.png',
                badge: 'icon-192.png',
                requireInteraction: true,
                ...options
            });
        } catch (e) {
            console.error('Notification error:', e);
        }
    },
    
    timerComplete(mode) {
        const messages = {
            work: { title: '🎉 Work session complete!', body: 'Time to take a break.' },
            shortBreak: { title: '☕ Short break over', body: 'Ready to focus again?' },
            longBreak: { title: '🌟 Long break over', body: 'Ready to start a new cycle?' }
        };
        
        const msg = messages[mode] || messages.work;
        this.send(msg.title, { body: msg.body });
    }
};

// ============================================
// AUDIO
// ============================================
const audio = {
    getContext() {
        try {
            if (!state.audioCtx) {
                state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Resume if suspended (browser autoplay policy)
            if (state.audioCtx.state === 'suspended') {
                state.audioCtx.resume().catch(err => {
                    console.log('AudioContext resume failed:', err);
                });
            }
            return state.audioCtx;
        } catch (err) {
            console.error('AudioContext creation failed:', err);
            return null;
        }
    },
    
    play(soundType = 'default') {
        if (!state.soundEnabled) return;
        
        try {
            const ctx = this.getContext();
            if (!ctx) return;
            
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
        } catch (err) {
            console.error('Audio play error:', err);
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
// THEME MANAGER
// ============================================
const themeManager = {
    apply(theme) {
        document.body.setAttribute('data-theme', theme);
        state.theme = theme;
        if (elements.themeLabel) {
            elements.themeLabel.textContent = theme === 'dark' ? 'Dark' : 'Light';
        }
    },
    
    toggle() {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
        persistence.saveSettings();
    },
    
    init() {
        this.apply(state.theme);
    }
};

// ============================================
// TIMER LOGIC (Fixed: Using Date.now() for accuracy)
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
        if (!state.startTime) return;
        
        // Use Date.now() for accurate timing, even in background tabs
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        state.timeLeft = Math.max(0, state.remainingAtStart - elapsed);
        
        if (state.timeLeft <= 0) {
            this.onComplete();
        }
        ui.update();
        persistence.saveState();
    },
    
    onComplete() {
        const previousMode = state.mode;
        const soundType = state.mode === 'work' ? 'workEnd' : 'breakEnd';
        
        // Record session completion for stats
        if (previousMode === 'work') {
            stats.recordSession(state.customWorkMinutes);
        }
        
        audio.play(soundType);
        notifications.timerComplete(previousMode);
        
        if (state.mode === 'work') {
            state.workSessionsCompleted++;
            if (state.workSessionsCompleted % CONFIG.SESSIONS_BEFORE_LONG_BREAK === 0) {
                state.mode = 'longBreak';
                state.timeLeft = state.customLongBreakMinutes * 60;
            } else {
                state.mode = 'shortBreak';
                state.timeLeft = state.customShortBreakMinutes * 60;
            }
            // Auto-start break if enabled
            if (state.autoStartBreak) {
                this.start();
                return;
            }
        } else {
            state.mode = 'work';
            state.timeLeft = state.customWorkMinutes * 60;
            // Auto-start work after break
            this.start();
            return;
        }
        
        this.pause();
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
        state.startTime = Date.now();
        state.remainingAtStart = state.timeLeft;
        persistence.saveState();
        wakeLockManager.request();
        
        // Clear any existing interval before starting a new one
        clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => this.tick(), CONFIG.TIMER_TICK_INTERVAL);
    },
    
    pause() {
        state.isRunning = false;
        state.startTime = null;
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
            // Recalculate based on elapsed time since save
            const now = Date.now();
            const elapsed = Math.floor((now - state.startTime) / 1000);
            state.timeLeft = Math.max(0, state.remainingAtStart - elapsed);
            if (state.timeLeft <= 0) { this.onComplete(); return; }
            wakeLockManager.request();
            state.timerInterval = setInterval(() => this.tick(), CONFIG.TIMER_TICK_INTERVAL);
            persistence.saveState();
        }
    },
    
    // Clear interval when page is hidden (prevents memory leak)
    handleVisibilityChange() {
        if (document.hidden && state.timerInterval) {
            // Interval keeps running but tick() will use Date.now() for accuracy
            // This prevents unnecessary CPU usage in background
        }
    }
};

// ============================================
// STATS TRACKING
// ============================================
const stats = {
    // Calculate data size using Blob for accurate byte count
    getDataSize(data) {
        const jsonString = JSON.stringify(data);
        return new Blob([jsonString]).size;
    },
    
    recordSession(minutes) {
        const today = utils.getTodayKey();
        const data = storage.get('stats') || {};
        
        if (!data[today]) {
            data[today] = { sessions: 0, focusMinutes: 0 };
        }
        
        data[today].sessions++;
        data[today].focusMinutes += minutes;
        
        // Keep only last 30 days
        const keys = Object.keys(data).sort();
        if (keys.length > 30) {
            delete data[keys[0]];
        }
        
        storage.set('stats', data);
        this.updateUI();
    },
    
    getTodayStats() {
        const today = utils.getTodayKey();
        const data = storage.get('stats') || {};
        return data[today] || { sessions: 0, focusMinutes: 0 };
    },
    
    updateUI() {
        const todayStats = this.getTodayStats();
        if (elements.todaySessions) {
            elements.todaySessions.textContent = todayStats.sessions;
        }
        if (elements.todayFocusTime) {
            elements.todayFocusTime.textContent = utils.formatDuration(todayStats.focusMinutes);
        }
    },
    
    clear() {
        storage.delete('stats');
        this.updateUI();
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
        if (elements.progressCircle) {
            elements.progressCircle.style.strokeDashoffset = offset;
        }
        
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
        if (elements.iconPlay) {
            elements.iconPlay.style.display = state.isRunning ? 'none' : 'block';
        }
        if (elements.iconPause) {
            elements.iconPause.style.display = state.isRunning ? 'block' : 'none';
        }
        
        // Update page title
        document.title = `${utils.formatTime(state.timeLeft)} - ${state.mode === 'work' ? 'Focus' : 'Break'}`;
    },
    
    updateBadge() {
        const badgeClass = {
            work: 'mode-work',
            shortBreak: 'mode-short-break',
            longBreak: 'mode-long-break'
        }[state.mode];
        
        if (elements.badge) {
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
        }
    },
    
    updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        if (elements.clock) {
            elements.clock.textContent = `${h}:${m}`;
        }
    },
    
    initClock() {
        this.updateClock();
        // Store interval reference for cleanup
        state.clockInterval = setInterval(() => this.updateClock(), 1000);
    },
    
    // Clear clock interval on page hide
    clearClockInterval() {
        if (state.clockInterval) {
            clearInterval(state.clockInterval);
            state.clockInterval = null;
        }
    }
};

// ============================================
// SETTINGS
// ============================================
const settings = {
    open() {
        if (elements.workMinutesInput) {
            elements.workMinutesInput.value = state.customWorkMinutes;
        }
        if (elements.shortBreakMinutesInput) {
            elements.shortBreakMinutesInput.value = state.customShortBreakMinutes;
        }
        if (elements.longBreakMinutesInput) {
            elements.longBreakMinutesInput.value = state.customLongBreakMinutes;
        }
        
        if (elements.soundToggle) {
            this.updateToggleUI(elements.soundToggle, state.soundEnabled);
        }
        if (elements.autoStartBreakToggle) {
            this.updateToggleUI(elements.autoStartBreakToggle, state.autoStartBreak);
        }
        if (elements.themeToggle) {
            this.updateToggleUI(elements.themeToggle, state.theme === 'dark');
        }
        
        if (elements.settingsModal) {
            elements.settingsModal.classList.add('active');
        }
        
        // Update stats display
        stats.updateUI();
        
        // Request notification permission
        notifications.requestPermission();
    },
    
    close() {
        this.save();
        if (elements.settingsModal) {
            elements.settingsModal.classList.remove('active');
        }
    },
    
    updateToggleUI(container, isActive) {
        const toggle = container.querySelector('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('active', isActive);
        }
    },
    
    getToggleState(container) {
        const toggle = container.querySelector('.toggle-switch');
        return toggle ? toggle.classList.contains('active') : false;
    },
    
    save() {
        const oldWorkMinutes = state.customWorkMinutes;
        const oldShortBreakMinutes = state.customShortBreakMinutes;
        const oldLongBreakMinutes = state.customLongBreakMinutes;
        
        // Validate inputs before saving
        if (elements.workMinutesInput) {
            state.customWorkMinutes = utils.validateMinutes(elements.workMinutesInput.value, 1, 120);
        }
        if (elements.shortBreakMinutesInput) {
            state.customShortBreakMinutes = utils.validateMinutes(elements.shortBreakMinutesInput.value, 1, 60);
        }
        if (elements.longBreakMinutesInput) {
            state.customLongBreakMinutes = utils.validateMinutes(elements.longBreakMinutesInput.value, 1, 120);
        }
        
        state.soundEnabled = elements.soundToggle ? this.getToggleState(elements.soundToggle) : state.soundEnabled;
        state.autoStartBreak = elements.autoStartBreakToggle ? this.getToggleState(elements.autoStartBreakToggle) : state.autoStartBreak;
        
        const newTheme = elements.themeToggle && this.getToggleState(elements.themeToggle) ? 'dark' : 'light';
        if (newTheme !== state.theme) {
            themeManager.apply(newTheme);
        }
        
        // Save to localStorage
        persistence.saveSettings();
        
        // Update timer if paused AND current mode's duration changed
        if (!state.isRunning) {
            let currentModeDurationChanged = false;
            switch (state.mode) {
                case 'work':
                    currentModeDurationChanged = oldWorkMinutes !== state.customWorkMinutes;
                    break;
                case 'shortBreak':
                    currentModeDurationChanged = oldShortBreakMinutes !== state.customShortBreakMinutes;
                    break;
                case 'longBreak':
                    currentModeDurationChanged = oldLongBreakMinutes !== state.customLongBreakMinutes;
                    break;
            }
            
            if (currentModeDurationChanged) {
                state.timeLeft = timer.getTotalTime();
            }
            ui.update();
            persistence.saveState();
        }
    },
    
    reset() {
        if (!confirm('Reset all settings to default? This will also clear saved state.')) return;
        
        // Reset state
        Object.assign(state, {
            customWorkMinutes: CONFIG.DEFAULTS.workMinutes,
            customShortBreakMinutes: CONFIG.DEFAULTS.shortBreakMinutes,
            customLongBreakMinutes: CONFIG.DEFAULTS.longBreakMinutes,
            soundEnabled: CONFIG.DEFAULTS.soundEnabled,
            autoStartBreak: CONFIG.DEFAULTS.autoStartBreak,
            theme: CONFIG.DEFAULTS.theme,
            mode: 'work',
            timeLeft: CONFIG.DEFAULTS.workMinutes * 60,
            isRunning: false,
            workSessionsCompleted: 0,
            startTime: null,
            remainingAtStart: 0
        });
        
        // Clear storage
        persistence.clearAll();
        
        // Clear timer
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        wakeLockManager.release();
        
        // Update UI
        if (elements.workMinutesInput) {
            elements.workMinutesInput.value = state.customWorkMinutes;
        }
        if (elements.shortBreakMinutesInput) {
            elements.shortBreakMinutesInput.value = state.customShortBreakMinutes;
        }
        if (elements.longBreakMinutesInput) {
            elements.longBreakMinutesInput.value = state.customLongBreakMinutes;
        }
        if (elements.soundToggle) {
            this.updateToggleUI(elements.soundToggle, true);
        }
        if (elements.autoStartBreakToggle) {
            this.updateToggleUI(elements.autoStartBreakToggle, false);
        }
        if (elements.themeToggle) {
            this.updateToggleUI(elements.themeToggle, true);
        }
        
        themeManager.apply(state.theme);
        ui.update();
        stats.clear();
        
        alert('Settings reset to defaults!');
    },
    
    toggleSound() {
        const toggle = elements.soundToggle?.querySelector('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('active');
            this.save();
        }
    },
    
    toggleAutoStartBreak() {
        const toggle = elements.autoStartBreakToggle?.querySelector('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('active');
            this.save();
        }
    },
    
    toggleTheme() {
        const toggle = elements.themeToggle?.querySelector('.toggle-switch');
        if (toggle) {
            toggle.classList.toggle('active');
            themeManager.apply(toggle.classList.contains('active') ? 'dark' : 'light');
            this.save();
        }
    },
    
    init() {
        if (elements.settingsBtn) {
            elements.settingsBtn.addEventListener('click', () => this.open());
        }
        if (elements.settingsClose) {
            elements.settingsClose.addEventListener('click', () => this.close());
        }
        if (elements.settingsReset) {
            elements.settingsReset.addEventListener('click', () => this.reset());
        }
        
        if (elements.soundToggle) {
            elements.soundToggle.addEventListener('click', () => this.toggleSound());
        }
        if (elements.autoStartBreakToggle) {
            elements.autoStartBreakToggle.addEventListener('click', () => this.toggleAutoStartBreak());
        }
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Auto-save on input change with validation
        const validateInput = (input) => {
            if (input) {
                const value = parseInt(input.value, 10);
                if (isNaN(value) || value < 1) {
                    input.value = 1;
                } else if (value > 120) {
                    input.value = 120;
                }
            }
        };
        
        if (elements.workMinutesInput) {
            elements.workMinutesInput.addEventListener('change', () => {
                validateInput(elements.workMinutesInput);
                this.save();
            });
        }
        if (elements.shortBreakMinutesInput) {
            elements.shortBreakMinutesInput.addEventListener('change', () => {
                validateInput(elements.shortBreakMinutesInput);
                this.save();
            });
        }
        if (elements.longBreakMinutesInput) {
            elements.longBreakMinutesInput.addEventListener('change', () => {
                validateInput(elements.longBreakMinutesInput);
                this.save();
            });
        }
        
        // Close on backdrop click
        if (elements.settingsModal) {
            elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === elements.settingsModal) this.close();
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'Escape' && elements.settingsModal?.classList.contains('active')) {
                this.close();
            }
        });
    }
};

// ============================================
// PERSISTENCE (Migrated to localStorage)
// ============================================
const persistence = {
    saveSettings() {
        const settings = {
            workMinutes: state.customWorkMinutes,
            shortBreakMinutes: state.customShortBreakMinutes,
            longBreakMinutes: state.customLongBreakMinutes,
            soundEnabled: state.soundEnabled,
            autoStartBreak: state.autoStartBreak,
            theme: state.theme
        };
        storage.set('settings', settings);
    },
    
    loadSettings() {
        const settings = storage.get('settings');
        if (!settings) return;
        
        state.customWorkMinutes = settings.workMinutes ?? CONFIG.DEFAULTS.workMinutes;
        state.customShortBreakMinutes = settings.shortBreakMinutes ?? CONFIG.DEFAULTS.shortBreakMinutes;
        state.customLongBreakMinutes = settings.longBreakMinutes ?? CONFIG.DEFAULTS.longBreakMinutes;
        state.soundEnabled = settings.soundEnabled ?? CONFIG.DEFAULTS.soundEnabled;
        state.autoStartBreak = settings.autoStartBreak ?? CONFIG.DEFAULTS.autoStartBreak;
        state.theme = settings.theme ?? CONFIG.DEFAULTS.theme;
    },
    
    saveState() {
        const stateData = {
            mode: state.mode,
            timeLeft: state.timeLeft,
            isRunning: state.isRunning,
            workSessionsCompleted: state.workSessionsCompleted,
            startTime: state.startTime,
            remainingAtStart: state.remainingAtStart,
            timestamp: Date.now()
        };
        storage.set('state', stateData);
    },
    
    loadState() {
        const savedState = storage.get('state');
        if (!savedState) return false;
        
        try {
            const now = Date.now();
            const elapsed = Math.floor((now - savedState.timestamp) / 1000);
            
            state.mode = savedState.mode || 'work';
            state.workSessionsCompleted = savedState.workSessionsCompleted || 0;
            state.startTime = savedState.startTime;
            state.remainingAtStart = savedState.remainingAtStart || 0;
            
            if (savedState.isRunning && state.startTime) {
                // Recalculate based on elapsed time
                const totalElapsed = Math.floor((now - state.startTime) / 1000);
                state.timeLeft = Math.max(0, state.remainingAtStart - totalElapsed);
                
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
                    state.startTime = null;
                } else {
                    state.isRunning = true;
                }
            } else {
                state.timeLeft = savedState.timeLeft || state.customWorkMinutes * 60;
                state.isRunning = false;
                state.startTime = null;
            }
            
            return true;
        } catch (e) {
            console.log('Failed to load state:', e);
            return false;
        }
    },
    
    clearAll() {
        storage.delete('settings');
        storage.delete('state');
        storage.delete('stats');
    },
    
    initAutoSave() {
        // Save before unload
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Periodic save while running
        setInterval(() => {
            if (state.isRunning) {
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
                    
                case '?':
                    settings.open();
                    break;
                    
                case '/':
                    if (e.shiftKey) {
                        settings.open();
                    }
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
                .then(reg => {
                    console.log('SW registered:', reg.scope);
                    // Check for updates
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New version available');
                                // Optionally show update notification
                            }
                        });
                    });
                })
                .catch(err => console.log('SW registration failed:', err));
        }
    }
};

// ============================================
// PAGE VISIBILITY HANDLER (Fix memory leak)
// ============================================
const visibilityHandler = {
    init() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden - clear clock interval to prevent memory leak
                ui.clearClockInterval();
            } else {
                // Page is visible again - restart clock
                ui.initClock();
                ui.updateClock();
                ui.update(); // Refresh timer display
            }
            timer.handleVisibilityChange();
        });
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
    
    // Apply theme
    themeManager.init();
    
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
    stats.updateUI();
    
    // Initialize modules
    settings.init();
    keyboard.init();
    fullscreen.init();
    doubleTapFullscreen.init();
    persistence.initAutoSave();
    serviceWorker.init();
    visibilityHandler.init();
    
    // Event listeners for controls
    if (elements.playBtn) {
        elements.playBtn.addEventListener('click', () => timer.toggle());
    }
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => timer.reset());
    }
    if (elements.modeBtn) {
        elements.modeBtn.addEventListener('click', () => timer.switchMode());
    }
    
    // Request notification permission on first interaction
    document.addEventListener('click', () => {
        notifications.requestPermission();
    }, { once: true });
    
    // Resume timer if it was running
    timer.resumeFromLoadedState();
}

// Start the app
init();
