# Running Automaton Locally with Ollama (Termux / ARM64)

This guide explains how to run the Conway Automaton entirely offline using
[Ollama](https://ollama.com) with the **Qwen2 7B** model on an Android device
via [Termux](https://termux.dev) and
[proot-distro](https://github.com/termux/proot-distro) on Snapdragon 8 Elite
(ARM64) hardware.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Android | 12+ |
| Termux (from F-Droid) | latest |
| proot-distro | latest |
| Available storage | ≥ 10 GB (model ~4.5 GB) |
| RAM | ≥ 8 GB recommended |

> **Note:** Install Termux from [F-Droid](https://f-droid.org/packages/com.termux/).
> The Play Store version is outdated and will not work correctly.

---

## 1. Install Termux packages

```bash
pkg update && pkg upgrade -y
pkg install -y proot-distro curl wget git
```

---

## 2. Set up a Debian (ARM64) proot environment

```bash
proot-distro install debian
proot-distro login debian
```

Inside the Debian session:

```bash
apt update && apt upgrade -y
apt install -y curl git nodejs npm
```

---

## 3. Install Ollama inside the proot environment

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Start the Ollama server in the background:

```bash
ollama serve &
```

Verify it is running:

```bash
curl http://localhost:11434/api/tags
```

---

## 4. Pull the Qwen2 7B model

```bash
ollama pull qwen2:7b
```

This downloads approximately 4.5 GB. The automaton can also pull the model
automatically on first run.

To verify the model is available:

```bash
ollama list
```

---

## 5. Install the Automaton runtime

```bash
git clone https://github.com/Conway-Research/automaton.git
cd automaton
npm install
npm run build
```

---

## 6. Configure environment variables

Set the Ollama host so the automaton uses the local server:

```bash
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=qwen2:7b   # optional — this is already the default
```

You can add these to `~/.bashrc` or `~/.profile` to persist them across
sessions.

---

## 7. Run the setup wizard

```bash
node dist/index.js --setup
```

During setup:

1. A wallet is generated automatically.
2. When prompted for **Ollama host URL**, enter `http://localhost:11434` (or
   press Enter if `OLLAMA_HOST` is already set).
3. When prompted for **Ollama model name**, press Enter to accept the default
   `qwen2:7b`.
4. The Conway API key step can be skipped — local Ollama inference does not
   require it.

---

## 8. Start the automaton

```bash
node dist/index.js --run
```

The automaton will:

1. Detect `OLLAMA_HOST` (or the `ollamaHost` field in `~/.automaton/automaton.json`).
2. Verify the Qwen2 7B model is present and pull it if needed.
3. Begin the agent loop using local inference — no internet connection required
   for the LLM itself.

---

## 9. Keeping Ollama running across Termux sessions

To keep Ollama alive in the background even after closing the Termux terminal,
use a dedicated background session or Termux's `nohup`:

```bash
nohup ollama serve > ~/ollama.log 2>&1 &
```

Or create a simple startup script at `~/.bashrc`:

```bash
# Auto-start Ollama if not already running
if ! pgrep -x ollama > /dev/null; then
  ollama serve &
fi
```

---

## Troubleshooting

### "Failed to pull Ollama model"

Make sure `ollama serve` is running:

```bash
ollama serve &
```

Then verify connectivity:

```bash
curl http://localhost:11434/api/tags
```

### Out of memory errors

Qwen2 7B requires ~5–6 GB of RAM. If you encounter OOM errors, try the smaller
`qwen2:1.5b` model:

```bash
export OLLAMA_MODEL=qwen2:1.5b
ollama pull qwen2:1.5b
```

Or set it permanently in `~/.automaton/automaton.json`:

```json
{
  "ollamaModel": "qwen2:1.5b"
}
```

### Node.js version too old

The automaton requires Node.js ≥ 20. Install a recent version via
[nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

## Summary

```
Android (Snapdragon 8 Elite / ARM64)
└── Termux
    └── proot-distro (Debian ARM64)
        ├── ollama serve       # local inference server
        │   └── qwen2:7b       # 4.5 GB local model
        └── node dist/index.js --run   # automaton runtime
```

All inference happens locally — no OpenAI, Anthropic, or Conway API key
required. The Conway API is still used for optional features such as credit
management, sandbox provisioning, and on-chain identity registration.
