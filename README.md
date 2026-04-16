# 🌿 Largo — Votre Partenaire M&A Intelligent

> *Largo — Partenaire, pas outil. Évolutif, pas statique.*

Largo est un assistant IA spécialisé dans les **fusions-acquisitions françaises**, construit sur le framework [AionUi](https://github.com/iOfficeAI/AionUi). Conçu pour les professionnels du M&A, Largo combine une interface élégante avec une expertise sectorielle profonde.

---

## ✨ Thème Mint Whisper

Largo utilise le thème **Mint Whisper** — une esthétique fraîche et aérienne avec des tons mint-teal délicats et des fonds crème chaleureux.

| Principe | Description |
|----------|-------------|
| **Respiration** | Espacement généreux et contrastes doux |
| **Fraîcheur** | Accents mint-teal qui dynamisent sans submerger |
| **Chaleur** | Fonds crème accueillants, pas cliniques |
| **Raffinement** | Dégradés subtils et transitions douces |

**Typographie** :
- Corps de texte : **Plus Jakarta Sans**
- Titres : **Cormorant Garamond**
- Code : **JetBrains Mono**

---

## 🎯 Mission

Être le partenaire de travail des professionnels M&A — apprendre, s'adapter, et assister dans le quotidien des fusions-acquisitions.

### Ce que Largo est

- ✅ Un partenaire qui apprend de vos préférences
- ✅ Un assistant M&A spécialisé (marché français small-mid cap)
- ✅ Un facilitateur de décision avec sources citées
- ✅ Un automate pour les tâches répétitives (valorisation, recherche, reporting)

### Ce que Largo n'est pas

- ❌ Un chatbot générique
- ❌ Un remplaçant humain pour la prise de décision
- ❌ Une encyclopédie infaillible (il vérifie et cite ses sources)

---

## 🚀 Fonctionnalités

### Assistants M&A Spécialisés

| Assistant | Description |
|-----------|-------------|
| **Largo M&A Partner** | Partenaire principal — analyse, conseil, conversation naturelle |
| **Largo Research** | Recherche entreprises françaises (SIRENE, Pappers, Infogreffe) |
| **Largo Valuation** | Valorisation par multiples sectoriels, DCF, actif net corrigé |

### Capacités Héritées d'AionUi

- 📊 **Création de documents** : Excel, PowerPoint, Word, PDF
- 🤖 **Mode Agent** : Exécution autonome de tâches complexes
- 🔌 **MCP (Model Context Protocol)** : Intégration avec outils externes
- 👥 **Mode Équipe** : Collaboration multi-agents
- 🌐 **WebUI** : Accès depuis mobile et navigateur
- 🔒 **Sécurité** : Authentification, CSRF, rate limiting

### Expertise M&A France

- Terminologie française (EBE, CA, capitaux propres)
- Multiples sectoriels small-mid cap France
- 4 phases M&A : Approche → LOI → Due Diligence → Closing
- 10 règles d'or du M&A
- Scoring d'attractivité des cibles

---

## 🌍 Langues

Largo est disponible en **français** (langue principale) et dans 8 langues supplémentaires :

| Langue | Code |
|--------|------|
| 🇫🇷 Français | `fr-FR` |
| 🇺🇸 English | `en-US` |
| 🇨🇳 简体中文 | `zh-CN` |
| 🇯🇵 日本語 | `ja-JP` |
| 🇹🇼 繁體中文 | `zh-TW` |
| 🇰🇷 한국어 | `ko-KR` |
| 🇹🇷 Türkçe | `tr-TR` |
| 🇷🇺 Русский | `ru-RU` |
| 🇺🇦 Українська | `uk-UA` |

---

## 🛠️ Installation

### Prérequis

- Node.js 20+
- Bun (gestionnaire de paquets)

### Développement

```bash
# Installer les dépendances
bun install

# Lancer en mode développement
bun run start

# Lancer le WebUI (sans Electron)
bun run webui
```

### Build

```bash
# Build pour macOS
bun run dist:mac

# Build pour Windows
bun run dist:win

# Build pour Linux
bun run dist:linux
```

---

## 📂 Architecture

```
src/
├── common/          # Code partagé (types, API, config)
├── process/         # Processus principal (Electron main)
│   ├── bridge/      # Communication IPC
│   ├── resources/   # Assistants et skills
│   ├── services/    # Services backend
│   ├── task/        # Gestion des agents
│   └── webserver/   # Serveur WebUI
├── renderer/        # Interface React
│   ├── components/  # Composants UI
│   ├── pages/       # Pages de l'application
│   ├── services/    # i18n, PWA
│   └── styles/      # Thème Mint Whisper
├── preload/         # Bridge sécurisé (IPC)
└── server.ts        # Point d'entrée WebUI standalone
```

---

## 🔐 Sécurité & Confidentialité

- ✅ Conversations stockées localement (SQLite chiffré)
- ✅ Pas de télémétrie vers des tiers
- ✅ Clés API gérées localement
- ✅ Authentification WebUI avec tokens sécurisés
- ✅ CSRF protection et rate limiting

---

## 📄 Licence

[Apache-2.0](LICENSE)

---

*Largo 2.0 — Construit avec 🌿 par l'équipe Alecia M&A*
