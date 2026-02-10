# ⚡ Speed Reading

Speed Reading is an advanced note analysis feature in LLMSider that quickly generates in-depth summaries, core insights, knowledge structure diagrams, and extended reading suggestions for your notes.

## ✨ Feature Overview

The Speed Reading feature uses AI to comprehensively analyze the current note and displays the following in a real-time sidebar drawer:

- **Content Summary**: A concise 200-300 word summary
- **Core Points**: 3-5 key insights with important concepts highlighted in bold
- **Knowledge Structure**: Interactive mind map showing the hierarchical structure
- **Extended Reading**: Topic suggestions based on the content
- **You Might Be Interested**: Inferred extension topics based on the note content

## 🚀 How to Use

### Quick Start

1. **Open a Note to Analyze**
   - Open any Markdown note in Obsidian

2. **Trigger Speed Reading**
   - Via Command Palette: `Ctrl/Cmd + P` → Search for "Speed Reading"
   - Or use a hotkey (if configured)

3. **View Analysis Results**
   - The sidebar drawer opens automatically, showing real-time analysis progress
   - AI generates content in streaming mode—you can view results as they appear

### Analysis Result Caching

- Analysis results for each note are **automatically saved**
- Opening Speed Reading again displays previous results instantly
- Saves API calls and waiting time

### Regeneration

If the note content has been updated or you need a fresh analysis:

1. Click the **"Regenerate"** button in the Speed Reading drawer
2. The system deletes the old result and starts a new analysis
3. New results replace the previous cache

## 📊 Key Features

### 1. Real-time Streaming Output

- AI-generated content displays in real-time
- Mind map nodes render progressively
- Enhanced interactive experience

### 2. Intelligent Language Detection

- Automatically detects note language (Chinese, English, etc.)
- Analysis results output in **the same language as the note**
- No manual configuration needed

### 3. Related Notes Integration

If vector database is enabled:

- Speed Reading automatically finds the 3 most relevant notes
- Uses related note content as contextual reference
- Generates more comprehensive and insightful analysis
- Provides knowledge-base-driven extension topics in "You Might Be Interested"

### 4. Knowledge Structure Visualization

- Uses **jsMind** to generate interactive mind maps
- Supports node expand/collapse
- Clearly shows the note's hierarchical structure
- At least 3 levels of node depth

### 5. Core Point Highlighting

- Keywords in each core point are automatically **bolded**
- Quickly locate important concepts
- Convenient for quick review

## ⚙️ Configuration Requirements

### Required Configuration

1. **AI Connection**
   - Must configure at least one AI provider (OpenAI, Claude, GitHub Copilot, etc.)
   - Configure in Settings → LLMSider → Connections

2. **Active Model**
   - At least one available model
   - Recommended: High-quality models like GPT-4, Claude

### Optional Configuration

1. **Vector Database** (Recommended)
   - When enabled, related notes are linked
   - Provides richer analysis context
   - See [Search Enhancement Configuration](search-enhancement.md)

2. **Hotkey**
   - Configure a hotkey for the "Speed Reading" command in Settings → Hotkeys
   - Improves access efficiency

## 💡 Usage Tips

### Best Practices

1. **Suitable Note Types**
   - Works best with long articles and study notes
   - Content-rich notes with clear structure
   - Technical documentation, reading notes, etc.

2. **Optimize Analysis Quality**
   - Use heading levels (`#`, `##`, `###`) to organize content
   - Enable vector database for related note references
   - Ensure note content is complete and meaningful

3. **Result Reuse**
   - Analysis results are automatically saved
   - Suitable for long-term notes reviewed periodically
   - No need to re-analyze if content hasn't changed

### Performance Optimization

- Speed Reading uses streaming API calls for fast responses
- Large notes (5000+ words) may take longer
- Related note queries add minimal processing time (typically <2 seconds)

## 🔍 Example Scenarios

### Scenario 1: Study Note Summary

1. Complete a deep learning note
2. Use Speed Reading to generate summary and key points
3. View mind map to clarify knowledge structure
4. Continue deeper exploration based on extended reading suggestions

### Scenario 2: Quick Review

1. Open a previous note
2. Trigger Speed Reading (cached results display instantly)
3. Quickly review via summary and key points
4. Use mind map to locate key sections

### Scenario 3: Knowledge Connection

1. Enable vector database
2. Use Speed Reading on a new note
3. System automatically links related notes
4. Discover extension topics within your knowledge base in "You Might Be Interested"

## 🛠️ Technical Details

### Data Storage

- Speed Reading results stored in SQLite database
- Location: `.obsidian/plugins/obsidian-llmsider/memory-data/`
- Table name: `speed_reading_results`
- Fields include: note path, title, summary, key points, mind map, etc.

### API Calls

- Uses the currently active AI provider
- Employs streaming API
- Single call generates all analysis content
- Token usage depends on note length (typically 1000-5000 tokens)

### Mind Map Format

Speed Reading uses jsMind node format:

```json
{"id":"root","topic":"Main Topic"}
{"id":"sub1","parentid":"root","topic":"Subtopic 1","direction":"right"}
{"id":"sub2","parentid":"root","topic":"Subtopic 2","direction":"left"}
```

- One complete node JSON object per line
- Root node contains `id` and `topic`
- Child nodes contain `id`, `parentid`, `topic`, `direction`

## 🚫 Limitations & Notes

1. **Markdown Files Only**
   - Speed Reading works only with `.md` files
   - PDFs, images, etc. need conversion or text extraction first

2. **AI Connection Required**
   - Must configure a valid API key
   - Feature unavailable without an active model

3. **Content Length Limits**
   - Subject to model context window limits (typically 4K-128K tokens)
   - Very long notes may be truncated or fail

4. **Language Support**
   - AI automatically detects and matches note language
   - Analysis quality depends on model's support for that language

5. **Network Requirements**
   - Requires stable internet connection
   - API call failures display error notifications

## 📚 Related Documentation

- [Search Enhancement](search-enhancement.md) - Enable related note linking
- [Connections & Models](connections-and-models.md) - Configure AI providers
- [Settings Guide](settings-guide.md) - Complete configuration instructions

---

**Tip**: Speed Reading is designed to help you quickly understand and organize note content, but it should not completely replace deep reading. Use it as a supplementary tool alongside your own thinking and comprehension.
