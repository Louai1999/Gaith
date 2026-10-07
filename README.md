# Gaith
# Python Project
Personal projects: a voice assistant (**Ghaith**) and an Arabic fitness tracker backend (**Himma**).
## Ghaith — Voice assistant (`Louai.py`)
Voice assistant for Louai. Say the wake word **غيث** (or **Ghaith**), then ask in Arabic or English.
**Features**
- Speech-to-text (Google Speech Recognition)
- Replies via Groq (`llama-3.3-70b-versatile`)
- Text-to-speech with Edge TTS (Arabic / English voices)
- Optional web search (weather, news, etc.) via DuckDuckGo
- PC commands: open Chrome/YouTube, sleep mode (via voice)
**Requirements**
- Python 3.10+
- Microphone
- Windows (sleep command uses `rundll32`)
**Setup**
1. Clone the repo and go to the project folder.
2. Create a virtual environment (recommended):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
