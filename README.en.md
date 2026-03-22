English | [简体中文](./README.zh.md)

# Wolfcha

> An AI Werewolf game — play Werewolf together with AI models

## 🔀 About This Fork

This project is forked from [oil-oil/wolfcha](https://github.com/oil-oil/wolfcha), originally created at the "Guancha + ModelScope Global Hackathon". Thanks to the original team for open-sourcing it! Play the original online at [wolf-cha.com](https://wolf-cha.com).

## 📝 Changes from the Original

Compared to the upstream repo, this fork includes:

- **Deployment focus**: Targeting NAS / home server self-hosting via Docker
- **More AI providers**: Added support for OpenAI, Google Gemini, Anthropic, and any OpenAI-compatible API (e.g. [SiliconFlow](https://cloud.siliconflow.com), Ollama)
- **AI reasoning improvements**:
  - Taught AI roles common game tactics (e.g. wolf badge bluffing, seer-track via sheriff badge)
  - Improved structure of context information fed to AI
  - Fixed logical contradictions in the original prompts
  - Allow wolves to skip kill and guards to skip protect
- **UI refinements**:
  - Added model selection settings
  - Added role composition configuration and scenario description
  - Allow wolves to skip kill and guards to skip protect
- **Game guide**: Added a [game guide](guide.en.md)

## 🚀 Quick Start with Docker

### Prerequisites

You need at least one AI provider API key to run the app.

### Option 1: docker run

```bash
docker run -d \
  -p 7860:7860 \
  -e OPENAI_COMPATIBLE_BASE_URL=https://your-provider/v1 \
  -e OPENAI_COMPATIBLE_API_KEY=your-api-key \
  --restart unless-stopped \
  programus/wolfcha-ex:latest
```

Then open [http://localhost:7860](http://localhost:7860).

### Option 2: docker-compose

```yaml
# docker-compose.yml
services:
  wolfcha:
    image: programus/wolfcha-ex:latest
    ports:
      - "7860:7860"
    env_file:
      - .env.docker
    restart: unless-stopped
```

Create a `.env.docker` file with the required environment variables (see the table below).

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SITE_PASSWORD` | Site-wide access password (empty = no auth) | _(empty, no auth)_ |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `OPENAI_BASE_URL` | OpenAI endpoint base URL | `https://api.openai.com/v1` |
| `GOOGLE_API_KEY` | Google Gemini API key | — |
| `GOOGLE_BASE_URL` | Google API base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | — |
| `ANTHROPIC_BASE_URL` | Anthropic API base URL | `https://api.anthropic.com/v1` |
| `OPENAI_COMPATIBLE_BASE_URL` | Any OpenAI-compatible provider base URL | — |
| `OPENAI_COMPATIBLE_API_KEY` | API key for the compatible provider | — |
| `OPENAI_COMPATIBLE_MODELS` | Comma-separated model IDs; leave empty to auto-fetch from `/models` | _(auto-fetch)_ |
| `ZENMUX_API_KEY` | ZenMux aggregator API key | — |
| `DASHSCOPE_API_KEY` | Alibaba Cloud DashScope API key | — |
| `NEXT_PUBLIC_SHOW_DEVTOOLS` | Show dev tools in non-production builds | `"true"` |

### Notes on AI Providers

**`OPENAI_COMPATIBLE_*`** is the most flexible option — it works with any OpenAI-compatible service: [SiliconFlow](https://cloud.siliconflow.com), local Ollama, LM Studio, and more. Set `OPENAI_COMPATIBLE_MODELS` to a comma-separated list of model IDs, or leave it empty to auto-fetch from the provider's `/models` endpoint.

**`SITE_PASSWORD`**: Leave empty to disable authentication — suitable for local network deployments.

### Verified Models

The following models have been tested and confirmed working:

| Provider | Model |
|---|---|
| OpenAI | GPT-5.1 |
| Google | Gemini 2.5 Flash |
| OpenAI Compatible | [SiliconFlow](https://cloud.siliconflow.com) models |

Other providers and models should be compatible in theory but have not been fully tested.

## 📄 License

MIT