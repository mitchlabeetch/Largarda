# ACP Adapter Extension Guide

## Overview

Step-by-step guide to creating an ACP (Agent Communication Protocol) adapter extension for Largo. ACP adapters allow integration with external CLI tools that support the ACP protocol.

## What is an ACP Adapter?

ACP adapters bridge Largo with external command-line tools that implement the Agent Communication Protocol. This enables Largo to use specialized AI tools beyond its built-in providers.

### Example Use Cases

- Integration with CodeBuddy for code assistance
- Connection to custom AI CLI tools
- Support for specialized domain-specific tools
- Integration with open-source AI projects

## Extension Structure

```
my-acp-adapter/
├── aion-extension.json    # Extension manifest
├── assets/                # Icons and static files
│   └── icon.svg
└── i18n/                  # Internationalization (optional)
    ├── en-US.json
    └── fr-FR.json
```

## Step-by-Step Guide

### Step 1: Create Extension Directory

```bash
mkdir my-acp-adapter
cd my-acp-adapter
```

### Step 2: Create Manifest (aion-extension.json)

```json
{
  "name": "my-acp-adapter",
  "displayName": "My ACP Adapter",
  "version": "1.0.0",
  "description": "ACP adapter for external AI tool",
  "author": "Your Name",
  "contributes": {
    "acpAdapters": [
      {
        "id": "my-tool",
        "name": "My Tool",
        "description": "Description of the tool",
        "connectionType": "cli",
        "cliCommand": "my-tool",
        "defaultCliPath": "npx @scope/my-tool",
        "acpArgs": ["--acp"],
        "icon": "assets/icon.svg",
        "authRequired": false,
        "supportsStreaming": true
      }
    ]
  }
}
```

### Manifest Properties Explained

| Property            | Type     | Required | Description                         |
| ------------------- | -------- | -------- | ----------------------------------- |
| `id`                | string   | Yes      | Unique identifier for the adapter   |
| `name`              | string   | Yes      | Internal name (same as CLI command) |
| `description`       | string   | Yes      | Human-readable description          |
| `connectionType`    | string   | Yes      | Always `"cli"` for ACP adapters     |
| `cliCommand`        | string   | Yes      | CLI command to execute              |
| `defaultCliPath`    | string   | Yes      | Default path or npx command         |
| `acpArgs`           | string[] | No       | Arguments to enable ACP mode        |
| `icon`              | string   | Yes      | Path to icon asset                  |
| `authRequired`      | boolean  | No       | Whether authentication is required  |
| `supportsStreaming` | boolean  | No       | Whether tool supports streaming     |

### Step 3: Add Icon

Create an SVG icon in the `assets/` directory:

```bash
mkdir assets
# Add your icon.svg file
```

**Icon Requirements:**

- SVG format
- 24x24 or 32x32 recommended size
- Simple, recognizable design
- Use standard colors

### Step 4: Add Internationalization (Optional)

Create locale files for multi-language support:

```bash
mkdir i18n
```

**en-US.json:**

```json
{
  "adapterName": "My Tool",
  "adapterDescription": "Description of the tool"
}
```

**fr-FR.json:**

```json
{
  "adapterName": "Mon Outil",
  "adapterDescription": "Description de l'outil"
}
```

### Step 5: Test Locally

```bash
# Install extension
largo extension install ./my-acp-adapter

# Verify installation
largo extension list

# Test the adapter
# Open Largo and select the new adapter from settings
```

## Example: CodeBuddy Adapter

Based on the example in `examples/acp-adapter-extension/`:

```json
{
  "name": "example-acp-adapter",
  "displayName": "Example ACP Adapter Extension",
  "version": "1.0.0",
  "description": "A sample extension demonstrating how to contribute ACP adapters",
  "author": "AionUI Contributors",
  "contributes": {
    "acpAdapters": [
      {
        "id": "ext-buddy",
        "name": "ext-buddy",
        "description": "Extension-provided CodeBuddy ACP adapter",
        "connectionType": "cli",
        "cliCommand": "codebuddy",
        "defaultCliPath": "npx @tencent-ai/codebuddy-code",
        "acpArgs": ["--acp"],
        "icon": "assets/codebuddy.svg",
        "authRequired": true,
        "supportsStreaming": false
      }
    ]
  }
}
```

## Advanced Configuration

### Custom CLI Path

Users can override the default CLI path in settings:

```json
{
  "defaultCliPath": "/usr/local/bin/my-tool"
}
```

Or use environment variables:

```json
{
  "defaultCliPath": "my-tool"
}
```

### Authentication

If your tool requires authentication:

```json
{
  "authRequired": true
}
```

The user will be prompted to provide credentials in Largo settings.

### Streaming Support

For tools that support streaming responses:

```json
{
  "supportsStreaming": true
}
```

This enables real-time token streaming in the chat interface.

### Custom Arguments

Add additional arguments for the CLI:

```json
{
  "acpArgs": ["--acp", "--model", "gpt-4", "--temperature", "0.7"]
}
```

## Troubleshooting

### Tool Not Found

**Error**: `Command not found: my-tool`

**Solution**:

- Verify `defaultCliPath` is correct
- Ensure tool is installed globally or via npx
- Check PATH environment variable

### ACP Protocol Errors

**Error**: `ACP protocol error`

**Solution**:

- Verify tool supports ACP protocol
- Check `acpArgs` are correct
- Test tool manually in terminal

### Icon Not Displaying

**Error**: Icon missing

**Solution**:

- Verify icon path is correct
- Ensure SVG file exists
- Check icon file is not corrupted

## Best Practices

### Naming

- Use kebab-case for IDs: `my-tool-adapter`
- Use descriptive names: `code-assistant-adapter`
- Include version in name if multiple versions

### Description

- Keep descriptions concise (under 100 characters)
- Focus on what the tool does
- Mention key features

### Icons

- Use simple, recognizable icons
- Ensure good contrast
- Test at small sizes

### Testing

- Test installation and uninstallation
- Verify tool works end-to-end
- Test with different configurations
- Test on multiple platforms if possible

## Publishing

### Prepare for Distribution

```bash
# Create a zip file
zip -r my-acp-adapter.zip my-acp-adapter/
```

### Publish to Extension Hub

1. Upload zip file to extension hub
2. Fill in metadata
3. Add screenshots
4. Submit for review

### Share Directly

Share the zip file with users:

```bash
largo extension install ./my-acp-adapter.zip
```

## Related Documentation

- [Extension Manifest Reference](../api-reference/extension-manifest.md) - Full manifest schema
- [Extension Development Guide](../onboarding/extension-development.md) - General extension development
- [examples/acp-adapter-extension/](../../examples/acp-adapter-extension/) - Working example
