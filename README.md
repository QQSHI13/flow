# Flow ⏱️

A beautiful, customizable Pomodoro timer that helps you stay focused and productive.

![Flow Screenshot](screenshot.png)

## ✨ Features

- **🎯 Pomodoro Technique** — Work in focused 25-minute intervals with short and long breaks
- **⌨️ Keyboard Shortcuts** — Control the timer without leaving your keyboard
- **📱 PWA Support** — Install as an app on desktop and mobile
- **🎨 Customizable** — Adjust work/break durations to match your workflow
- **📊 Statistics** — Track your productivity over time
- **🔔 Notifications** — Audio and visual alerts when timer completes
- **💾 Persistent State** — Timer survives page refreshes

## 🚀 Quick Start

### Try it now
**Live Demo:** https://qqshi13.github.io/flow/

### Run locally
```bash
# Clone the repository
git clone https://github.com/QQSHI13/flow.git
cd flow

# Open index.html in your browser
# Or use a local server:
python -m http.server 8000
```

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Storage:** localStorage for settings and statistics
- **PWA:** Service Worker for offline support
- **Audio:** Web Audio API for notification sounds

## 📖 How to Use

1. **Start a session** — Click the play button or press `Space`
2. **Work for 25 minutes** — Stay focused on your task
3. **Take a break** — When the timer ends, take a 5-minute short break
4. **Long break** — After 4 pomodoros, take a 15-minute break
5. **Track progress** — View your completed sessions in the stats panel

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start/Pause timer |
| `R` | Reset timer |
| `S` | Skip to next mode |
| `F` | Toggle fullscreen |

## 📝 Why I Built This

I was frustrated with existing Pomodoro apps that were either too cluttered or too simple. I wanted something clean, customizable, and that worked offline. Flow is my solution — a timer that gets out of your way and lets you focus on what matters.

## 🐛 Known Issues

- Notifications may not work in some mobile browsers
- Audio requires user interaction first (browser security policy)

## 🔮 Future Plans

- [ ] Task tracking and todo integration
- [ ] Export statistics to CSV
- [ ] Dark/light theme toggle
- [ ] Multi-language support

## 📄 License

This project is licensed under the [GPL-3.0 License](LICENSE).

## 🙏 Credits

Built with ❤️ by [QQ](https://github.com/QQSHI13) & [Nova ☄️](https://openclaw.ai)

Powered by [OpenClaw](https://openclaw.ai)

---

**⭐ Star this repo if you find it useful!**
