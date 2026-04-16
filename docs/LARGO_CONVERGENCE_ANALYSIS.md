# Largo — Analyse de Convergence

> Confrontation entre le projet Largo (knowledge base + monorepo Next.js) et le framework AionUi (Electron + React)

---

## 1. Vue d'Ensemble

| Aspect | Largo (sources) | AionUi (framework) | Convergence |
|--------|----------------|---------------------|-------------|
| **Architecture** | Next.js 16 monorepo + Flowise/n8n | Electron + React + WebUI | AionUi fournit le cadre desktop/web ; la logique M&A de Largo est injectée via assistants et skills |
| **Base de données** | SQLite (WAL, FTS5, 20+ tables) | SQLite (better-sqlite3) | ✅ Compatible directement |
| **UI Components** | shadcn/ui + Radix | Arco Design + Icon Park | AionUi conservé (Arco) — thème Mint Whisper appliqué |
| **i18n** | Français natif | 8 langues (zh-CN, en-US, etc.) | ✅ fr-FR ajouté comme langue principale |
| **AI/LLM** | Groq, Ollama, Kimi, GPT-4 | Anthropic, OpenAI, Google Gemini, AWS Bedrock | ✅ AionUi supporte tous les fournisseurs |
| **Agent System** | Flowise agents + n8n workflows | Agent managers (Gemini, Remote, OpenClaw, AionRS) | ✅ Largo personality injectée dans les assistants |
| **Documents** | python-pptx, Excel, PDF OCR | officecli (PPTX, XLSX, DOCX) | ✅ officecli plus puissant que python-pptx |
| **Communication** | WhatsApp (Baileys), Email, Slack | MCP servers + WebUI | Partiellement — WhatsApp/Slack via MCP custom |

---

## 2. Fonctionnalités Conservées de Largo

### ✅ Intégrées dans AionUi/Largo

| Fonctionnalité Largo | Implémentation AionUi |
|---------------------|----------------------|
| Personnalité dual-mode (partenaire/professionnel) | Assistant preset `largo-mna-partner` |
| Recherche entreprises françaises | Assistant preset `largo-research` |
| Valorisation (multiples, DCF) | Assistant preset `largo-valuation` |
| Terminologie M&A française | Injectée dans tous les assistants |
| 10 règles d'or M&A | Dans le system prompt du partenaire |
| Multiples sectoriels France | Référence intégrée dans les assistants |
| Création Excel/PPTX | Assistants existants (excel-creator, ppt-creator) rebrandés Largo |
| Génération de documents | officecli skills (plus puissant que python-pptx) |
| Mode sombre | ✅ Mint Whisper dark mode |
| Mémoire et apprentissage | Conversation history + agent context |

### 🔄 À Implémenter (futur)

| Fonctionnalité Largo | Statut |
|---------------------|--------|
| WhatsApp Gateway (Baileys) | Non implémenté — nécessite MCP server custom |
| Email IMAP/SMTP | Non implémenté — nécessite MCP server custom |
| Veille M&A quotidienne (cron 9h) | Cron system existe dans AionUi — workflow à créer |
| Pipedrive CRM intégration | Non implémenté — via MCP ou API |
| SIRENE/Pappers API directe | Non implémenté — via MCP ou agent web search |
| OCR documents (python service) | Non implémenté — AionUi utilise officecli |
| Meeting prep (Teams/Graph API) | Non implémenté |

### ❌ Abandonnées (tech stack deprecated)

| Fonctionnalité Largo | Raison |
|---------------------|--------|
| Flowise chatflow | Remplacé par le système d'agents AionUi |
| n8n workflows | Remplacé par le cron system et agents AionUi |
| PostgreSQL + pgvector | Remplacé par SQLite (AionUi standard) |
| MinIO file storage | Remplacé par le file system local d'AionUi |
| Docker Compose multi-services | Remplacé par Electron standalone |
| Turbo monorepo | Architecture unique AionUi |

---

## 3. Mapping Thématique

### Couleurs : AOU Purple → Mint Whisper

| Ancien (AOU) | Nouveau (Mint Whisper) | Token |
|--------------|----------------------|-------|
| `#7583b2` (purple) | `#3aab94` (mint-teal) | `--brand` |
| `#165dff` (blue) | `#5db8a3` (primary mint) | `--primary` |
| `#ffffff` (white) | `#fdfcf9` (warm cream) | `--bg-base` |
| `#0e0e0e` (black) | `#111418` (deep charcoal) | `--bg-base` (dark) |
| `#e9efff` (light blue) | `#e6f5f0` (pale mint) | `--message-user-bg` |
| `#eff0f6` (lavender) | `#f0faf7` (lightest mint) | `--aou-1` |

### Typographie

| Ancien | Nouveau | Usage |
|--------|---------|-------|
| System sans-serif | Plus Jakarta Sans | Corps de texte |
| (aucune serif) | Cormorant Garamond | Titres H1-H3 |
| (aucune mono) | JetBrains Mono | Code, données |

---

## 4. Contexte France — Éléments Clés Préservés

### Fiscal (2024-2026)

- IS : 25% (réduit 15% PME sur premiers 42,5K€)
- Plus-values : 19% + 17,2% prélèvements sociaux = 30%
- TVA : 20% standard, 5,5% réduit, 10% intermédiaire
- PFU dividendes : 30%

### Structures juridiques

- SAS (flexible, minimum 1€)
- SARL (traditionnel, minimum 1€)
- SA (grande taille, minimum 37K€)
- Holding (exonération si > 25K€, > 2 ans)

### Sources de données

- SIRENE (INSEE) — gratuit
- Pappers — 50-200€/mois
- Infogreffe — RCS
- Bodacc — annonces légales

### Écosystème Côte d'Azur

- Sophia Antipolis : 2 500+ entreprises tech/biotech
- Eurobiomed : 350+ santé
- Monaco : family offices, luxury
- Investisseurs : Bpifrance Méditerranée, PACA Investissement

---

## 5. Recommandations d'Évolution

### Court terme (déjà fait ✅)

1. ✅ Renommage AionUi → Largo
2. ✅ Thème Mint Whisper (light + dark)
3. ✅ Typographie (Plus Jakarta Sans, Cormorant Garamond, JetBrains Mono)
4. ✅ Locale fr-FR complète
5. ✅ Assistants M&A (partner, research, valuation)
6. ✅ Documentation Largo

### Moyen terme (prochaines étapes)

1. 🔄 Création de MCP servers custom pour SIRENE/Pappers API
2. 🔄 Workflow de veille M&A quotidienne via cron system
3. 🔄 Intégration WhatsApp via MCP server Baileys
4. 🔄 Templates de documents M&A (teaser, IM, NDA)
5. 🔄 Skill Largo pour valorisation automatique

### Long terme

1. 📋 Intégration CRM (Pipedrive)
2. 📋 Module de due diligence structuré
3. 📋 Dashboard M&A avec métriques pipeline
4. 📋 Intégration Office 365 (Outlook, Teams)
5. 📋 Voice mode avec TTS/STT français

---

*Document généré le 15 avril 2026 — Largo v2.0*
