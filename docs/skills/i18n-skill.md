# i18n Skill

## Overview

The i18n (internationalization) skill provides guidance on managing translations and user-facing text in Largo. It ensures all user-facing text uses i18n keys and follows proper translation workflows.

## Triggers

This skill is invoked when:

- Adding new user-facing text
- Modifying files in `src/renderer/`
- Modifying files in `locales/`
- Modifying files in `src/common/config/i18n`
- User requests i18n guidance

## Core Principles

### Never Hardcode Strings

All user-facing text must use i18n keys, never hardcoded strings.

```typescript
// BAD
<Button>Click me</Button>

// GOOD
<Button>{t('button.clickMe')}</Button>
```

### Key Naming Conventions

- Use dot notation for hierarchy: `section.component.action`
- Use camelCase for key names
- Be descriptive and specific
- Group related keys together

**Examples**:

- `conversation.sendButton`
- `settings.theme.dark`
- `error.connection.failed`

## i18n Configuration

### Configuration File

Location: `src/common/config/i18n-config.json`

```json
{
  "defaultLocale": "en-US",
  "locales": [
    {
      "code": "en-US",
      "name": "English (United States)",
      "flag": "🇺🇸"
    },
    {
      "code": "fr-FR",
      "name": "Français (France)",
      "flag": "🇫🇷"
    },
    {
      "code": "zh-CN",
      "name": "中文 (简体)",
      "flag": "🇨🇳"
    }
  ]
}
```

### Adding a New Language

1. Add language to `i18n-config.json`
2. Create locale file: `locales/[code].json`
3. Add all keys with translations
4. Validate with check script

## Using i18n in Code

### React Components

```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <Button>{t('button.clickMe')}</Button>
  )
}
```

### With Parameters

```typescript
// Locale file
{
  "welcome": "Welcome, {{name}}!"
}

// Component
const { t } = useTranslation()
t('welcome', { name: 'John' })
```

### Pluralization

```typescript
// Locale file
{
  "itemCount_one": "{{count}} item",
  "itemCount_other": "{{count}} items"
}

// Component
t('itemCount', { count: 5 })
```

## Adding New Translations

### Step 1: Add Key to Default Locale

Edit `locales/en-US.json`:

```json
{
  "myNewSection": {
    "myKey": "My new text"
  }
}
```

### Step 2: Add to All Other Locales

Edit each locale file with translations:

`locales/fr-FR.json`:

```json
{
  "myNewSection": {
    "myKey": "Mon nouveau texte"
  }
}
```

`locales/zh-CN.json`:

```json
{
  "myNewSection": {
    "myKey": "我的新文本"
  }
}
```

### Step 3: Generate Types

```bash
bun run i18n:types
```

This generates TypeScript types for all i18n keys.

### Step 4: Validate

```bash
node scripts/check-i18n.js
```

This checks for:

- Missing keys in any locale
- Extra keys in any locale
- Invalid JSON syntax

## File Structure

### Locale Files

```
locales/
├── en-US.json          # Default locale (English)
├── fr-FR.json          # French
├── zh-CN.json          # Chinese (Simplified)
└── ...
```

### Key Organization

Organize keys by feature/section:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "conversation": {
    "send": "Send",
    "newMessage": "New message"
  },
  "settings": {
    "theme": "Theme",
    "language": "Language"
  }
}
```

## Validation Workflow

### Before Committing

If your changes touch `src/renderer/`, `locales/`, or `src/common/config/i18n`:

```bash
# Generate types
bun run i18n:types

# Validate i18n
node scripts/check-i18n.js
```

Both commands must complete without errors before opening a PR.

### Common Validation Errors

#### Missing Key Error

```
Error: Key 'conversation.send' missing in fr-FR
```

**Solution**: Add the missing key to `locales/fr-FR.json`

#### Extra Key Error

```
Error: Key 'conversation.oldKey' exists in fr-FR but not en-US
```

**Solution**: Remove the extra key from `locales/fr-FR.json` or add to `en-US.json`

#### JSON Syntax Error

```
Error: Invalid JSON in locales/fr-FR.json
```

**Solution**: Fix JSON syntax (missing comma, trailing comma, etc.)

## Best Practices

### DO

- Add keys to all locales simultaneously
- Use descriptive, hierarchical key names
- Group related keys together
- Validate before committing
- Generate types after adding keys
- Use parameters for dynamic content
- Consider context when translating

### DON'T

- Don't hardcode user-facing strings
- Don't use inconsistent key naming
- Don't forget to add to all locales
- Don't commit without validation
- Don't use machine translation without review
- Don't create overly long keys
- Don't nest keys too deeply (>3 levels)

## Translation Guidelines

### Context Matters

Provide context for translators:

```json
{
  "button": {
    "submit": "Submit", // Form submission
    "send": "Send", // Message sending
    "publish": "Publish" // Content publishing
  }
}
```

### Length Considerations

UI labels should be concise:

```json
{
  "short": "OK", // Good for buttons
  "long": "Click here to confirm" // Use for descriptions
}
```

### Cultural Sensitivity

Be aware of cultural differences:

- Date formats
- Number formats
- Color meanings
- Text direction (LTR/RTL)

## Dynamic Content

### Using Variables

```typescript
// Locale
{
  "greeting": "Hello, {{name}}!"
}

// Component
t('greeting', { name: userName })
```

### Conditional Content

```typescript
// Locale
{
  "status": {
    "online": "Online",
    "offline": "Offline"
  }
}

// Component
t(`status.${status}`)
```

### Complex Formatting

For complex formatting, use format functions:

```typescript
// Locale
{
  "dateRange": "From {{start}} to {{end}}"
}

// Component
t('dateRange', {
  start: formatDate(startDate),
  end: formatDate(endDate)
})
```

## Extension i18n

### Extension Locale Files

Extensions can include their own locale files:

```
my-extension/
├── aion-extension.json
├── i18n/
│   ├── en-US.json
│   └── fr-FR.json
```

### Extension Manifest

```json
{
  "i18n": {
    "localesDir": "i18n",
    "defaultLocale": "en-US"
  }
}
```

### Extension Key Prefix

Extension keys should be prefixed to avoid conflicts:

```json
{
  "myExtension": {
    "button": {
      "click": "Click"
    }
  }
}
```

## Testing i18n

### Test with Different Locales

```typescript
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import MyComponent from './MyComponent'

test('renders in French', () => {
  const i18n = createI18n({
    lng: 'fr-FR',
    resources: {
      'fr-FR': { translation: frFR }
    }
  })

  render(
    <I18nextProvider i18n={i18n}>
      <MyComponent />
    </I18nextProvider>
  )

  expect(screen.getByText('Texte en français')).toBeInTheDocument()
})
```

## Common Patterns

### Navigation Labels

```json
{
  "nav": {
    "home": "Home",
    "settings": "Settings",
    "about": "About"
  }
}
```

### Form Labels

```json
{
  "form": {
    "username": "Username",
    "password": "Password",
    "email": "Email"
  }
}
```

### Error Messages

```json
{
  "error": {
    "network": "Network error",
    "auth": "Authentication failed",
    "server": "Server error"
  }
}
```

### Success Messages

```json
{
  "success": {
    "saved": "Saved successfully",
    "deleted": "Deleted successfully",
    "sent": "Sent successfully"
  }
}
```

## Related Documentation

- [src/common/config/i18n-config.json](../../src/common/config/i18n-config.json) - i18n configuration
- [locales/](../../locales/) - Locale files
- [scripts/check-i18n.js](../../scripts/check-i18n.js) - Validation script
- [AGENTS.md](../../AGENTS.md) - Agent skills index
