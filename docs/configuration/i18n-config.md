# i18n Configuration Reference

## Overview

Internationalization (i18n) configuration for Largo, supporting 9 languages with modular translation files.

## Configuration File

### src/common/config/i18n-config.json

```json
{
  "languages": [
    {
      "code": "fr-FR",
      "name": "Français",
      "flag": "🇫🇷"
    },
    {
      "code": "en-US",
      "name": "English",
      "flag": "🇺🇸"
    },
    {
      "code": "zh-CN",
      "name": "简体中文",
      "flag": "🇨🇳"
    },
    {
      "code": "ja-JP",
      "name": "日本語",
      "flag": "🇯🇵"
    },
    {
      "code": "zh-TW",
      "name": "繁體中文",
      "flag": "🇹🇼"
    },
    {
      "code": "ko-KR",
      "name": "한국어",
      "flag": "🇰🇷"
    },
    {
      "code": "tr-TR",
      "name": "Türkçe",
      "flag": "🇹🇷"
    },
    {
      "code": "ru-RU",
      "name": "Русский",
      "flag": "🇷🇺"
    },
    {
      "code": "uk-UA",
      "name": "Українська",
      "flag": "🇺🇦"
    }
  ],
  "defaultLanguage": "fr-FR",
  "modules": ["common", "renderer", "settings", "conversation", "team", "ma"]
}
```

## Supported Languages

| Code  | Name       | Flag |
| ----- | ---------- | ---- |
| fr-FR | Français   | 🇫🇷   |
| en-US | English    | 🇺🇸   |
| zh-CN | 简体中文   | 🇨🇳   |
| ja-JP | 日本語     | 🇯🇵   |
| zh-TW | 繁體中文   | 🇹🇼   |
| ko-KR | 한국어     | 🇰🇷   |
| tr-TR | Türkçe     | 🇹🇷   |
| ru-RU | Русский    | 🇷🇺   |
| uk-UA | Українська | 🇺🇦   |

## Translation Modules

Translation files are organized by module in `locales/`:

```
locales/
├── fr-FR/
│   ├── common.json
│   ├── renderer.json
│   ├── settings.json
│   ├── conversation.json
│   ├── team.json
│   └── ma.json
├── en-US/
│   └── (same structure)
└── ...
```

## i18n Initialization

### src/common/config/i18n.ts

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import config from './i18n-config.json';

// Initialize i18next
i18n.use(initReactI18next).init({
  lng: config.defaultLanguage,
  fallbackLng: 'en-US',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: {
    // Load translation files for each language
    [lang]: {
      [module]: require(`../../locales/${lang}/${module}.json`),
    },
  },
});
```

## Usage in Code

### Using React Hook

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation('common');
  return <div>{t('welcome')}</div>;
}
```

### Using i18next Directly

```typescript
import i18n from 'i18next';

const message = i18n.t('common:welcome');
```

### Changing Language

```typescript
await i18n.changeLanguage('en-US');
```

## Adding New Translations

### 1. Add Translation Key

Add key to all language files:

```json
// locales/fr-FR/common.json
{
  "newKey": "Nouvelle clé"
}

// locales/en-US/common.json
{
  "newKey": "New key"
}
```

### 2. Use in Code

```tsx
const { t } = useTranslation('common')
<span>{t('newKey')}</span>
```

## Adding a New Language

### 1. Add to i18n-config.json

```json
{
  "languages": [
    {
      "code": "de-DE",
      "name": "Deutsch",
      "flag": "🇩🇪"
    }
  ]
}
```

### 2. Create Translation Directory

```
locales/de-DE/
├── common.json
├── renderer.json
└── ...
```

### 3. Add Translations

Copy structure from existing language and translate.

## Best Practices

### Key Naming

- Use kebab-case: `user-profile`, `settings-general`
- Use module prefix for clarity: `common:welcome`, `settings:theme`
- Group related keys: `settings.theme.light`, `settings.theme.dark`

### Pluralization

```json
{
  "item": "Item",
  "item_plural": "Items"
}
```

```tsx
const { t } = useTranslation()
<span>{t('item', { count: items.length })}</span>
```

### Interpolation

```json
{
  "greeting": "Hello, {{name}}!"
}
```

```tsx
<span>{t('greeting', { name: 'John' })}</span>
```

## Validation

Run i18n validation before committing:

```bash
bun run i18n:types          # Generate TypeScript types
node scripts/check-i18n.js   # Check for missing translations
```

## Related Documentation

- [src/common/config/i18n-config.json](../../src/common/config/i18n-config.json) - i18n configuration
- [src/common/config/i18n.ts](../../src/common/config/i18n.ts) - i18n initialization
- [locales/](../../locales/) - Translation files
- [AGENTS.md](../../AGENTS.md) - i18n workflow
