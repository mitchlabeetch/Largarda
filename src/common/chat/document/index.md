# src/common/chat/document/ - Document Processing

## Overview

Document processing utilities for chat context. Handles conversion of various document formats to text for inclusion in chat context.

## Directory Structure

### Files

- **DocumentConverter.ts** (6.6KB) - Document conversion implementation
  - PDF to text conversion
  - Word document parsing
  - Excel data extraction
  - Content preprocessing
  - Text chunking for context windows

## Supported Formats

### PDF

- Text extraction from PDF files
- Handling of multi-page documents
- OCR support (if available)
- Metadata extraction

### Word Documents

- .doc and .docx support
- Text extraction
- Table parsing
- Formatting preservation

### Excel

- .xlsx and .xls support
- Cell data extraction
- Sheet iteration
- Data structure preservation

## Features

### Content Extraction

- Extract text from documents
- Preserve structure where possible
- Handle encoding issues
- Clean up formatting artifacts

### Text Chunking

- Split long documents into chunks
- Respect context window limits
- Maintain semantic boundaries
- Overlap for continuity

### Preprocessing

- Remove headers/footers
- Clean up whitespace
- Normalize line endings
- Remove page numbers

## Usage Patterns

### Converting a Document

```typescript
import { DocumentConverter } from '@/common/chat/document';

const converter = new DocumentConverter();
const text = await converter.convertToText(fileBuffer, 'application/pdf');
```

### Chunking for Context

```typescript
const chunks = await converter.chunkForContext(text, {
  maxTokens: 4000,
  overlap: 200,
});
```

## Related Documentation

- [src/common/chat/](../) - Chat system overview
- [src/process/services/conversionService.ts](../../process/services/conversionService.ts) - Document conversion service
