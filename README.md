# nammaAPI

A unified multi-model AI workspace with shared chat memory across:
- **1. OpenAI** (`gpt-4o`, `gpt-4o-mini`, `o1-mini`, `gpt-4-turbo`, or custom)
- **2. Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, or custom)
- **3. Anthropic Claude** (`claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, or custom)
- **4. Other models** (DeepSeek V3 / R1, Groq LPU Llama 3.3, OpenRouter, or custom OpenAI-compatible endpoint)

---

## 4-Step Workflow

```
Step 1: Start the application
    A simple command-line interface initially
           │
           ▼
Step 2: Choose an AI provider & Model
    [1] OpenAI          [2] Google Gemini
    [3] Anthropic Claude [4] Other models
    └── Choose model (or enter custom model name)
           │
           ▼
Step 3: Enter the API key
    Use the key belonging to the selected provider
    (auto-detects environment variable if already configured)
           │
           ▼
Step 4: Start chatting
    Ask questions repeatedly until the user chooses to exit
```

---

## Web Interface (Hosted)

The application is now hosted and accessible both locally and through a live public tunnel:

- **Local Web UI**: [http://localhost:5000](http://localhost:5000)
- **Live Public URL**: [https://relationship-creatures-denied-mozilla.trycloudflare.com](https://relationship-creatures-denied-mozilla.trycloudflare.com)

To launch the web interface anytime:
```cmd
.\run_web.bat
```

---

## How to Run CLI Mode

### Method 1: Double-click or run batch script (Windows)
```cmd
.\run.bat
```

### Method 2: PowerShell
```powershell
.\run.ps1
```

### Method 3: Direct Python
```bash
python cli.py
```

---

## Chat Commands (CLI)
While in the chat loop:
- `exit` or `quit`: Exit the program
- `switch`: Switch to another AI provider or model without restarting
- `clear`: Clear the conversation history
- `help`: Display help info
