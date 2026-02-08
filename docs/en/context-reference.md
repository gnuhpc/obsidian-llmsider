# 📎 Context Reference

Context Reference is one of the core features of LLMSider, allowing you to easily introduce various types of content as context when chatting with AI, including notes, PDF documents, images, selected text, and more, enabling AI to provide more accurate and relevant answers based on this content.

## ✨ Feature Overview

Context Reference supports multiple content types:

- **Markdown Notes**: Include single or multiple note files
- **PDF Documents**: Automatically extract text content
- **Image Files**: Support JPG, PNG, GIF, WebP, etc. (multimodal models)
- **Office Documents**: Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
- **Selected Text**: Any selected content in the current note
- **Text Snippets**: Directly pasted or dragged text
- **Web Content**: Extract text from current webpage (requires opening in Obsidian's built-in Web Viewer)
- **YouTube Videos**: Automatically extract subtitle content (requires opening in Obsidian's built-in Web Viewer)

## 🎯 Ways to Add Context

### Method 1: Via Command Palette

1. **Include Current Note**
   - Open Command Palette: `Ctrl/Cmd + P`
   - Search for "Include current note"
   - The currently open note is added as context

2. **Include Selected Text**
   - Select any text in a note
   - Open Command Palette: `Ctrl/Cmd + P`
   - Search for "Include selected text"
   - The selected text is added as context

### Method 2: Drag and Drop

The most intuitive method is direct drag-and-drop:

1. **Drag Note Files**
   - Drag notes from the file list to the chat input box
   - Supports multiple files at once
   - Automatically recognizes Markdown, PDF, and other formats

2. **Drag Folders**
   - Drag entire folders to the input box
   - Traverses all Markdown files in the folder
   - Suitable for batch-adding related notes

3. **Drag Text Content**
   - Drag selected text from notes
   - Drag text snippets from external applications
   - Text is added as an independent context item

4. **Drag Images**
   - Support dragging images from the file system
   - Support dragging embedded images from notes
   - Requires models with vision capabilities (e.g., GPT-4 Vision, Claude 3)

### Method 3: Paste Operations

Paste content in the chat input box:

- Pasting text content adds it as text context
- Pasting file paths attempts to load the file
- Supports Obsidian internal link format (e.g., `[[Note Name]]`)

### Method 4: Smart Search

1. Click the "Search" button in the chat interface
2. Enter keywords in the search box
3. Select files from search results
4. Selected files are automatically added as context

### Method 5: Quick Suggestions

After you add a file:

- The system automatically recommends related files
- Related files display in gray/pending style
- Click to quickly add to context

## 📊 Context Types Explained

### 1. Markdown Notes

- Automatically extract complete text content
- Preserve heading hierarchy
- Support extracting embedded images
- Display character count and truncation information

**Example Scenario**:
```
User: Please summarize the commonalities of these three notes
[Drag in: Note A.md, Note B.md, Note C.md]
```

### 2. PDF Documents

- Automatically extract all text content
- Support multi-page PDFs
- Extract images (if enabled)
- Subject to model token limits; very long documents may be truncated

**Note**:
- PDF parsing quality depends on document format
- Scanned PDFs may require OCR (not built-in)
- Recommended: documents under 50-100 pages

### 3. Image Files

- Supported formats: JPG, PNG, GIF, WebP
- Automatically convert to Base64 encoding
- Support multimodal models (GPT-4V, Claude 3, Gemini Pro Vision, etc.)
- Image size limited by model support

**Usage Tip**:
```
User: What trend does this chart show?
[Drag in: chart.png]
```

### 4. Office Documents

- **Word (.docx)**: Extract text and tables
- **Excel (.xlsx)**: Extract worksheet data
- **PowerPoint (.pptx)**: Extract slide text

**Limitations**:
- Formatting and style information is lost
- Only plain text is extracted
- Complex tables may have messy formatting

### 5. Selected Text

- Support any length of text
- Preserve original format
- Automatically generate preview (first 100 characters)
- Can add multiple selected texts

**Quick Operation**:
1. Select text in a note
2. Use command "Include selected text"
3. Or right-click to select related option (if enabled)

**💡 Smart Editing Features**:

When you select text as context and ask AI to modify, polish, or rewrite it, LLMSider provides powerful comparison and apply functionality:

1. **Diff View**
   - Click the 👁️ "Toggle Diff View" button on the AI response
   - The system displays a visual diff comparison:
     - 🔴 Red: Content deleted from original
     - 🟢 Green: Content added by AI
   - Clearly see exactly what changes AI made
   - Click again to switch back to rendered view

2. **One-Click Apply**
   - After reviewing the diff, click ✅ "Apply Changes" button
   - Automatically replaces the selected portion in the original note with AI's content
   - No manual copy-paste needed
   - Supports undo (Ctrl/Cmd + Z)

**Typical Use Case**:
```
Scenario: Polish text
1. Select a paragraph that needs improvement in your note
2. Use "Include selected text" to add it as context
3. Ask: "Please polish this text to make it more professional"
4. After AI responds, click 👁️ to view specific changes
5. Once confirmed, click ✅ to apply changes to the note
```

**Important Notes**:
- Apply and Diff features are only available in "selected text" mode
- If multiple files are included, these buttons will be hidden
- Recommended to review diff before applying to ensure changes meet expectations

### 6. YouTube Videos

Special support:

- Recognize YouTube URL or video ID
- Automatically extract subtitles (if available)
- Convert to text context
- Support multi-language subtitles

**Important Notes**:
- Requires opening YouTube video in **Obsidian's built-in Web Viewer**
- After opening the video, add it as context via command palette or by dragging the URL
- The system automatically extracts subtitles from the currently opened video

**Supported URL Formats**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- Direct 11-digit video ID

### 7. Web Content

Special support:

- Extracts text content from current webpage
- Preserves main textual information
- Automatically filters ads and navigation elements

**Important Notes**:
- Requires opening webpage in **Obsidian's built-in Web Viewer**
- After opening the webpage, add current page content via command palette or shortcut
- Useful for having AI analyze articles, blogs, or documentation after reading

## ⚙️ Context Management

### View Added Context

- Context items display above the chat input box
- Each item shows name and type identifier
- Hover to view preview or detailed information

### Remove Context

- Click the ✕ button on the right side of a context item
- Can remove individual items
- Or use "Clear all context" command

### View Context Content

- Click a context item
- View complete content in a popup modal
- Support formatted text display

### Context Persistence

- Context is bound to the current session
- Automatically clears when switching sessions
- New sessions require re-adding context

## 🔧 Advanced Features

### Image Extraction

When enabled, automatically extract embedded images from Markdown notes:

1. Enable "Extract images from Markdown" in settings
2. Automatically scan image references when adding notes
3. Images are sent as multimodal content to AI

**Applicable Models**:
- GPT-4 Vision
- Claude 3 (Opus/Sonnet/Haiku)
- Gemini Pro Vision
- Other vision-capable models

### Related Note Suggestions

When vector database is enabled:

- Automatically find related notes when adding files
- Display suggestions in gray style
- One-click add related content
- See [Search Enhancement](search-enhancement.md) for details

### Token Limit Handling

- Automatically calculate context token count
- Automatically truncate when exceeding model limits
- Prioritize keeping file beginning content
- Display truncation warnings

**Optimization Suggestions**:
- Use large context models (e.g., GPT-4 128K, Claude 200K)
- Only add necessary context
- Split very long documents

### Multimodal Support

When using vision-capable models:

1. Images are sent in native format
2. AI can directly "see" image content
3. Support mixed image-text conversations
4. Can add multiple images simultaneously

## 💡 Usage Tips

### Best Practices

1. **Precise Context**
   - Only add content relevant to the question
   - Avoid irrelevant information interfering with AI judgment
   - Prefer selected text over entire notes

2. **Reasonable Batching**
   - Process large numbers of files across multiple conversation rounds
   - Avoid adding too much context at once
   - Observe AI response quality and adjust strategy

3. **Format Optimization**
   - Use clear heading hierarchy
   - Keep note structure complete
   - Avoid excessive formatting markers

4. **Leverage Caching**
   - Some models support context caching (e.g., Claude)
   - Place fixed context at conversation start
   - Reduce redundant sending of same content

### Common Scenarios

**Scenario 1: Literature Review**
```
1. Add 3-5 related paper notes
2. Ask: "What common findings do these studies have?"
3. AI performs comprehensive analysis based on all notes
```

**Scenario 2: Code Debugging**
```
1. Select buggy code snippet
2. Include selected text
3. Ask: "What's wrong with this code?"
```

**Scenario 3: Chart Analysis**
```
1. Drag in image containing chart
2. Ask: "Please analyze this sales trend chart"
3. AI recognizes chart and provides insights
```

**Scenario 4: Knowledge Connection**
```
1. Add topic note
2. System automatically suggests related notes
3. Select and add suggested notes
4. Ask: "What connections exist between these notes?"
```

## 🚫 Limitations & Notes

1. **File Size Limits**
   - Subject to model context window limits
   - PDF and Office documents recommended <10MB
   - Images recommended <5MB (depends on model)

2. **Format Support**
   - Plain text files may not correctly recognize encoding
   - Binary formats require native model support
   - Some special formats may fail to parse

3. **Token Consumption**
   - All context is sent with each conversation
   - Large amounts of context increase API costs
   - Image token consumption is typically high

4. **Performance Impact**
   - Large file parsing may take several seconds
   - Concurrent loading of multiple files increases latency
   - Image encoding consumes memory

5. **Privacy & Security**
   - Context content is sent to AI service providers
   - Be mindful of sensitive information protection
   - Self-hosted models can improve security

## 🛠️ Technical Details

### File Parser

LLMSider uses the `FileParser` class to handle different file types:

- **Markdown**: Native parsing, extract text and images
- **PDF**: Uses `pdf-parse` library
- **Office**: Uses mammoth (Word), xlsx (Excel), etc.
- **Images**: Convert to Base64 + MIME type

### Context Data Structure

```typescript
interface NoteContext {
  name: string;           // File name
  content: string;        // Text content
  filePath?: string;      // File path
  type?: string;          // File type
  metadata?: {
    originalLength?: number;
    truncated?: boolean;
    extractedImages?: ExtractedImage[];
    // ...
  };
}
```

### Token Calculation

- Uses `TokenManager` to estimate token count
- Based on OpenAI tiktoken library
- Supports different models' token limits

## 📚 Related Documentation

- [Chat Interface](chat-interface.md) - Learn about chat functionality
- [Search Enhancement](search-enhancement.md) - Enable related note suggestions
- [Connections & Models](connections-and-models.md) - Configure multimodal models
- [Settings Guide](settings-guide.md) - Customize context behavior

---

**Tip**: The Context Reference feature allows AI to "see" your note content, which is key to achieving personalized, accurate answers. Proper use of context can significantly enhance the practical value of your AI assistant.
