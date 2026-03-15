# Time & Flow ⏱️

A clean, minimalist Pomodoro timer built with vanilla JavaScript. No frameworks, no dependencies—just pure focus.

**Live Demo**: https://qqshi13.github.io/flow/

---

## ✨ Features

### Core Timer
- **🍅 Pomodoro Cycles** — 25min work → 5min short break → 15min long break (every 4 sessions)
- **⏯️ Play/Pause** — One-click timer control
- **🔄 Auto-transition** — Automatically moves between work and break sessions
- **🔔 Audio Notifications** — Pleasant chimes when timers complete

### Customization
- **⚙️ Adjustable Durations** — Customize work, short break, and long break times
- **💾 Persistent State** — Timer state saved to cookies (optional)
- **🌙 Dark Theme** — Easy on the eyes for long work sessions

### Productivity Features
- **🔒 Wake Lock** — Prevents screen from sleeping during timer
- **🖥️ Fullscreen Mode** — Press `F` or double-tap (mobile) for distraction-free mode
- **📊 Session Counter** — Track completed Pomodoro sessions

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `F` | Toggle Fullscreen |
| `R` | Reset Timer |
| `S` | Open Settings |

---

## 🚀 Usage

1. Open [Time & Flow](https://qqshi13.github.io/flow/) in your browser
2. Click the play button to start your first work session
3. Focus for 25 minutes, then take a break when the timer chimes
4. Repeat!

---

## 🛠️ Technologies

- **Frontend**: Vanilla HTML5
- **Styling**: CSS3 with CSS Variables
- **Logic**: Vanilla JavaScript (ES6+)
- **Features**: 
  - Wake Lock API for screen prevention
  - Fullscreen API
  - CSS Animations for smooth transitions
  - Cookie storage for preferences
  - PWA support (installable)

---

## 📦 Installation (Self-Host)

```bash
# Clone the repository
git clone https://github.com/QQSHI13/flow.git

# Open in browser
cd flow
# Open index.html in your browser
```

No build step required—it's pure HTML/CSS/JS!

---

## 🖼️ Screenshots

*Clean timer interface with circular progress ring*

---

## 📋 Roadmap

- [ ] Task list integration
- [ ] Statistics dashboard
- [ ] Export session data
- [ ] Background sounds (rain, white noise)
- [ ] Mobile app (Capacitor)

---

## 📝 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See [LICENSE](./LICENSE) for details.

---

## 🙏 Credits

Built with ❤️ by **QQ** and **Nova** ☄️

Powered by [OpenClaw](https://openclaw.ai)

Inspired by the Pomodoro Technique® by Francesco Cirillo.
