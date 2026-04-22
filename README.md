<div align="center">

# 🌿 Largo

**AI-Powered M&A Assistant for French Professionals**\
**Assistant IA pour les Fusions-Acquisitions Françaises**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.9.16-green.svg)](package.json)
[![Languages](https://img.shields.io/badge/languages-9-orange.svg)](#-internationalization--internationalisation)
[![Tests](https://img.shields.io/badge/tests-vitest-yellow.svg)](vitest.config.ts)
[![Build](https://img.shields.io/badge/build-electron--vite-purple.svg)](electron.vite.config.ts)

</div>

---

## 📖 Overview

Largo is an AI-powered M&A (Mergers & Acquisitions) assistant purpose-built for French deal professionals. Built on the [AionUi](https://github.com/iOfficeAI/AionUi) framework (Electron + React), Largo combines deep sector expertise — French company data, sector multiples, regulatory nuances — with modern AI capabilities including autonomous agents, document automation, and multi-provider LLM support. It is a partner, not just a tool: it learns your preferences, adapts to your workflow, and handles the repetitive work so you can focus on deal strategy.

> 🇫🇷 **Largo** est un assistant IA spécialisé dans les **fusions-acquisitions françaises**, conçu pour les professionnels du M&A small & mid-cap. Construit sur le framework [AionUi](https://github.com/iOfficeAI/AionUi) (Electron + React), Largo associe une expertise sectorielle profonde — données d'entreprises françaises, multiples sectoriels, terminologie réglementaire — à des capacités d'IA modernes : agents autonomes, création de documents et support multi-fournisseurs LLM. C'est un partenaire, pas un simple outil : il apprend vos préférences, s'adapte à votre workflow et prend en charge les tâches répétitives pour que vous puissiez vous concentrer sur la stratégie de deal.

---

## ✨ Features

### 🎯 M&A Intelligence

| Capability                  | Details                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Assistant Presets**       | M&A Partner (analysis & advice), Research (French company data via SIRENE, Pappers, Infogreffe), Valuation (sector multiples, DCF, adjusted net assets) |
| **French Market Expertise** | Native French M&A terminology (EBE, CA, capitaux propres), small & mid-cap sector multiples                                                             |
| **4-Phase M&A Framework**   | Approche → LOI → Due Diligence → Closing                                                                                                                |
| **10 Golden Rules**         | Built-in M&A best practices for deal execution                                                                                                          |
| **Target Scoring**          | Attractiveness scoring for acquisition targets                                                                                                          |

### 📊 Document Automation

Create professional deliverables directly from conversations:

- **Excel** — Financial models, comparables tables, data exports
- **PowerPoint** — Pitch decks, teasers, management presentations
- **Word** — LOIs, memos, due diligence reports
- **PDF** — Formatted exports of any document

### 🤖 AI Providers

| Provider        | Models                          |
| --------------- | ------------------------------- |
| **Anthropic**   | Claude (Sonnet, Opus, Haiku)    |
| **OpenAI**      | GPT-4o, GPT-4, o1, o3           |
| **Google**      | Gemini Pro, Gemini Flash        |
| **AWS Bedrock** | Claude, Titan, and more via AWS |

### 🧠 Agent System

- **Autonomous Execution** — Agents complete multi-step tasks independently
- **Team / Multi-Agent Mode** — Multiple agents collaborate on complex workflows
- **MCP Integration** — Model Context Protocol for external tool connections

### 🔒 Security & Privacy

- **Local-first storage** — Conversations stored in local SQLite (no cloud sync)
- **Zero telemetry** — No data sent to third parties
- **JWT Authentication** — Secure WebUI access with token-based auth
- **CSRF Protection** — Cross-site request forgery prevention
- **Rate Limiting** — API abuse protection built in

### 💻 Multi-Platform

| Platform    | Technology                               |
| ----------- | ---------------------------------------- |
| **Desktop** | macOS, Windows, Linux (Electron)         |
| **WebUI**   | Browser-based access (standalone server) |
| **Mobile**  | React Native (iOS & Android)             |

### 🌍 Internationalization / Internationalisation

9 languages supported — French is the primary language:

|     | Language             | Code    |
| --- | -------------------- | ------- |
| 🇫🇷  | Français _(primary)_ | `fr-FR` |
| 🇺🇸  | English              | `en-US` |
| 🇨🇳  | 简体中文             | `zh-CN` |
| 🇯🇵  | 日本語               | `ja-JP` |
| 🇹🇼  | 繁體中文             | `zh-TW` |
| 🇰🇷  | 한국어               | `ko-KR` |
| 🇹🇷  | Türkçe               | `tr-TR` |
| 🇷🇺  | Русский              | `ru-RU` |
| 🇺🇦  | Українська           | `uk-UA` |

---

## 🖼️ Screenshots

> **TODO:** Add screenshots of the Largo interface.

| Light Mode               | Dark Mode                |
| ------------------------ | ------------------------ |
| _Screenshot coming soon_ | _Screenshot coming soon_ |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ ([download](https://nodejs.org/))
- **Bun** ([install](https://bun.sh/))

### Development

```bash
# Install dependencies
bun install

# Start in development mode (Electron)
bun run start

# Start WebUI in browser (no Electron)
bun run webui
```

### Build

```bash
bun run dist:mac     # macOS (.dmg)
bun run dist:win     # Windows (.exe)
bun run dist:linux   # Linux (.AppImage)
```

---

## 🏗️ Architecture

Largo follows a **3-process model** inherited from AionUi, ensuring strict separation of concerns:

```
┌─────────────────────────────────────────────┐
│              Largo Application              │
├──────────┬──────────────┬───────────────────┤
│  Main    │   Renderer   │   Workers         │
│ Process  │   Process    │   (Fork)          │
│          │              │                   │
│ Electron │ React UI     │ Background tasks  │
│ Node.js  │ No Node APIs │ No Electron APIs  │
│ No DOM   │ Arco Design  │ Heavy computation │
│          │ UnoCSS       │                   │
├──────────┴──────┬───────┴───────────────────┤
│     Preload / IPC Bridge (src/preload.ts)   │
└─────────────────────────────────────────────┘
```

- **Main Process** (`src/process/`) — Electron main, Node.js APIs, backend services, agent orchestration
- **Renderer Process** (`src/renderer/`) — React UI, Arco Design components, UnoCSS styling
- **Workers** (`src/process/worker/`) — Forked processes for heavy computation, no Electron APIs

> 📄 Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🎨 Design System — Mint Whisper

Largo's visual identity is built on the **Mint Whisper** theme — a fresh, airy aesthetic with mint-teal accents and warm cream backgrounds.

| Pillar         | Description                                          |
| -------------- | ---------------------------------------------------- |
| **Breathing**  | Generous spacing and soft contrasts                  |
| **Freshness**  | Mint-teal accents that energize without overwhelming |
| **Warmth**     | Inviting cream backgrounds, never clinical           |
| **Refinement** | Subtle gradients and smooth transitions              |

**Typography:** Plus Jakarta Sans (body) · Cormorant Garamond (headings) · JetBrains Mono (code)

> 📄 Full details: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)

---

## 📚 Documentation

### User Guides

| Document                                       | Description                            |
| ---------------------------------------------- | -------------------------------------- |
| [User Guide](docs/USER_GUIDE.md)               | End-user guide for M&A professionals   |
| [Assistant Guide](docs/ASSISTANT_GUIDE.md)     | Creating and customizing AI assistants |
| [MCP Configuration](docs/MCP_CONFIGURATION.md) | MCP server setup and configuration     |
| [WebUI Guide](docs/WEBUI_GUIDE.md)             | Browser-based deployment and usage     |
| [Server Deploy](docs/SERVER_DEPLOY_GUIDE.md)   | Production server deployment           |

### Technical Documentation

| Document                                  | Description                                  |
| ----------------------------------------- | -------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)      | 3-process model, IPC bridge, module layout   |
| [Design System](docs/DESIGN_SYSTEM.md)    | Mint Whisper theme, typography, color tokens |
| [Security](docs/SECURITY.md)              | Auth, encryption, threat model, privacy      |
| [Roadmap](ROADMAP.md)                     | Planned features and milestones              |
| [Contributing](CONTRIBUTING.md)           | Development workflow, PR guidelines          |
| [Contributing (中文)](CONTRIBUTING.zh.md) | Contribution guide in Chinese                |
| [Code Style](docs/CODE_STYLE.md)          | Naming, linting, formatting rules            |

---

## 🛠️ Development

```bash
bun run lint:fix     # Auto-fix lint issues (oxlint)
bun run format       # Auto-format code (oxfmt)
bun run test         # Run test suite (Vitest)
bunx tsc --noEmit    # Type-check without emitting
```

### Pre-PR Checklist

```bash
# One-time setup
npm install -g @j178/prek

# Run the full CI check locally
prek run --from-ref origin/main --to-ref HEAD
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. The guide covers branching strategy, commit conventions, code quality checks, and the PR workflow.

> 🇫🇷 Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant d'ouvrir une pull request.

---

## 🔐 Security

Largo is designed with a **local-first, zero-telemetry** philosophy. All conversations and API keys remain on your machine. WebUI access is secured with JWT authentication, CSRF protection, and rate limiting.

For vulnerability reporting and the full security model, see [docs/SECURITY.md](docs/SECURITY.md).

> 🇫🇷 Largo adopte une philosophie **local-first, zéro télémétrie**. Toutes les conversations et clés API restent sur votre machine. Pour signaler une vulnérabilité, consultez [docs/SECURITY.md](docs/SECURITY.md).

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features, upcoming milestones, and the long-term vision for Largo.

---

## 📄 License

[Apache-2.0](LICENSE) — Free for commercial and personal use.

---

<div align="center">

Built with 🌿 by the Largo team

_Largo — Partner, not tool. Adaptive, not static._\
_Largo — Partenaire, pas outil. Évolutif, pas statique._

</div>
