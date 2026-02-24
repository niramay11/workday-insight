# TimeTrack Desktop Agent

A lightweight Python application that monitors employee activity by capturing screenshots and detecting idle time. It communicates with the TimeTrack backend via the Agent API.

## Requirements

- Python 3.9+
- pip

## Setup

1. **Install dependencies:**
   ```bash
   cd desktop-agent
   pip install -r requirements.txt
   ```

2. **Configure the agent:**
   ```bash
   cp config.example.json config.json
   ```

3. **Edit `config.json`** with your details:
   - `api_url`: Get this from **Settings → Agent API → Agent Endpoint URL**
   - `api_key`: Get this from **Settings → Agent API → API Key**
   - `user_id`: Your user UUID (ask your admin)
   - `screenshot_interval_seconds`: How often to capture (default: 300 = 5 minutes)
   - `idle_threshold_seconds`: Seconds without input before marking idle (default: 600 = 10 minutes)

4. **Run the agent:**
   ```bash
   python agent.py
   ```

## How It Works

- **Screenshots**: Captures the full desktop every N seconds (configurable). Images are compressed and uploaded to the backend.
- **Idle Detection**: Monitors keyboard and mouse activity. If no input for the threshold period, an idle event is recorded.
- **System Tray**: Shows a colored dot indicating status:
  - 🟢 Green = Active
  - 🟡 Yellow = Idle
  - 🔴 Red = Disconnected
- **Background**: Runs quietly in the system tray. Right-click to quit.

## Platform Notes

- **Windows**: Full support including system tray
- **macOS**: Requires accessibility permissions for input monitoring (System Preferences → Security & Privacy → Privacy → Accessibility)
- **Linux**: Requires `python3-xlib` for X11 input monitoring. System tray requires a desktop environment with tray support.

## Troubleshooting

- **"No active attendance session"**: You must punch in via the web app before the agent can record screenshots/idle events.
- **Screenshots not uploading**: Check your API key and URL in config.json. The agent logs errors to the console.
- **Idle detection not working on macOS**: Grant accessibility permissions to your terminal/Python.
