# 🔍 QMD Integration - Advanced Hybrid Search

## What is QMD?

**QMD (Query Markup Documents)** is a state-of-the-art hybrid search engine that combines three powerful search techniques:

1. **BM25 Full-Text Search** - Fast keyword matching using SQLite FTS5
2. **Vector Semantic Search** - Understanding meaning and context using embeddings
3. **LLM Re-ranking** - AI-powered relevance scoring for the best results

QMD runs **entirely locally** on your machine using GGUF models, providing:
- **Privacy**: All data stays on your device
- **Quality**: Combines the best of keyword, semantic, and AI-powered search
- **Offline**: No internet required after initial setup

---

## Installation

### Prerequisites

1. **Install Bun** (QMD's runtime):
   ```bash
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   
   # Windows (PowerShell)
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **Install Homebrew SQLite** (macOS only, for extension support):
   ```bash
   brew install sqlite
   ```

### Install QMD Globally

```bash
bun install -g https://github.com/tobi/qmd
```

This installs the `qmd` command globally on your system.

---

## Quick Setup

### 1. Index Your Vault

Navigate to your Obsidian vault directory and create a QMD collection:

```bash
cd ~/Documents/my-vault

# Add your vault as a collection
qmd collection add . --name my-vault

# Add context to help QMD understand your content
qmd context add qmd://my-vault "My Obsidian knowledge base"

# Generate embeddings for semantic search
qmd embed
```

### 2. Enable QMD in LLMSider

1. Open **Obsidian Settings** → **LLMSider** → **MCP Servers**
2. Find **QMD** in the server list
3. Click **Enable** and then **Connect**

The QMD MCP server is pre-configured in `mcp-config.json` and ready to use!

---

## Available Tools

Once connected, the AI can use these QMD tools:

### `qmd_search` - Fast Keyword Search
BM25 full-text search for quick keyword matching.

**Example**: "Find all notes about machine learning"
```
AI will use: qmd_search("machine learning")
```

### `qmd_vsearch` - Semantic Search
Vector-based search that understands meaning and context.

**Example**: "Find notes related to neural networks"
```
AI will use: qmd_vsearch("neural networks")
```

### `qmd_query` - Hybrid Search (Best Quality)
Combines BM25 + Vector + LLM reranking for the most accurate results.

**Example**: "What are my thoughts on AI safety?"
```
AI will use: qmd_query("AI safety thoughts")
```

### `qmd_get` - Retrieve Document
Get a specific note by path or document ID.

**Example**: "Show me the note about project timeline"
```
AI will use: qmd_get("projects/timeline.md")
```

### `qmd_multi_get` - Retrieve Multiple Documents
Get multiple notes at once using glob patterns.

**Example**: "Show all my daily notes from January 2025"
```
AI will use: qmd_multi_get("journals/2025-01-*.md")
```

### `qmd_status` - Index Status
Check the health and statistics of your QMD index.

---

## Configuration

### MCP Server Settings

The QMD MCP server is configured in `mcp-config.json`:

```json
{
  "qmd": {
    "autoApprove": [
      "qmd_search",
      "qmd_vsearch",
      "qmd_query",
      "qmd_get",
      "qmd_multi_get",
      "qmd_status"
    ],
    "disabled": false,
    "timeout": 120,
    "type": "stdio",
    "command": "qmd",
    "args": ["mcp"],
    "env": {},
    "autoConnect": false
  }
}
```

**Settings Explained**:
- `autoApprove`: Tools that don't require user confirmation
- `timeout`: Maximum execution time (120 seconds for complex searches)
- `command`: The `qmd` binary installed globally
- `args`: `["mcp"]` launches the MCP server mode
- `autoConnect`: Set to `true` to connect automatically on startup

### QMD Index Settings

Configure QMD behavior via command line:

```bash
# Update index when files change
qmd update

# Rebuild entire index (use when switching embedding models)
qmd embed -f

# Use a custom index name
qmd --index work search "quarterly reports"

# Set minimum relevance score
qmd query "user authentication" --min-score 0.3

# Get more results
qmd query "API design" -n 20
```

---

## Advanced Usage

### Multiple Collections

Organize different types of content:

```bash
# Personal notes
qmd collection add ~/notes --name personal
qmd context add qmd://personal "Personal knowledge base"

# Work documentation
qmd collection add ~/work-docs --name work
qmd context add qmd://work "Work documentation and notes"

# Research papers
qmd collection add ~/research --name research
qmd context add qmd://research "Academic research papers"

# Generate embeddings for all
qmd embed
```

Search specific collections:
```bash
qmd search "meeting notes" -c work
qmd query "machine learning papers" -c research
```

### Search Output Formats

Export results for processing:

```bash
# JSON format (for scripts)
qmd query "error handling" --json

# Markdown format (for notes)
qmd search "API design" --md --full

# CSV format (for spreadsheets)
qmd query "quarterly reports" --csv
```

### Query Customization

Fine-tune search behavior:

```bash
# Get all matches above threshold
qmd query "authentication" --all --min-score 0.4

# Full document content
qmd get "docs/api-reference.md" --full

# Limit line count
qmd get "long-document.md" -l 100

# Start from specific line
qmd get "doc.md:50" -l 50
```

---

## How QMD Search Works

### The Hybrid Pipeline

```
User Query
    │
    ├─► Query Expansion (LLM generates variations)
    │
    ├─► BM25 Search (keyword matching)
    │   └─► SQLite FTS5 index
    │
    ├─► Vector Search (semantic similarity)
    │   └─► Embedding model (local GGUF)
    │
    └─► Reciprocal Rank Fusion (combine results)
        │
        └─► LLM Re-ranking (score relevance)
            │
            └─► Final Results (best quality)
```

### Local GGUF Models

QMD uses three local models (auto-downloaded on first use):

| Model | Purpose | Size | Storage |
|-------|---------|------|---------|
| `embeddinggemma-300M-Q8_0` | Generate embeddings | ~300MB | `~/.cache/qmd/models/` |
| `qwen3-reranker-0.6b-q8_0` | Re-rank results | ~640MB | `~/.cache/qmd/models/` |
| `qmd-query-expansion-1.7B-q4_k_m` | Expand queries | ~1.1GB | `~/.cache/qmd/models/` |

**Total**: ~2GB disk space required

---

## Comparison: QMD vs Orama

LLMSider supports both QMD and Orama for different use cases:

| Feature | QMD | Orama (Built-in) |
|---------|-----|------------------|
| **Privacy** | ✅ 100% local | ⚠️ Remote API embeddings |
| **Search Quality** | ✅ BM25 + Vector + LLM | ✅ BM25 + Vector |
| **Offline** | ✅ Fully offline | ❌ Requires internet |
| **Setup** | ⚠️ External install | ✅ Built-in |
| **Performance** | ⚠️ Slower (local LLM) | ✅ Fast (remote API) |
| **Disk Usage** | ⚠️ ~2GB models | ✅ Minimal |
| **Integration** | ⚠️ Via MCP | ✅ Native |

**When to use QMD**:
- Privacy is critical (no data leaves your machine)
- Offline access required
- Best possible search quality needed
- You have disk space for models

**When to use Orama**:
- Quick setup preferred
- Internet always available
- Faster response times needed
- Limited disk space

---

## Troubleshooting

### QMD Command Not Found

**Solution**: Ensure `~/.bun/bin` is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.bun/bin:$PATH"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

### MCP Connection Failed

**Check QMD is installed**:
```bash
qmd --version
```

**Test MCP server manually**:
```bash
qmd mcp
```
Should start the MCP server. Press Ctrl+C to stop.

**Check LLMSider logs**:
1. Settings → LLMSider → Debug Mode → Enable
2. View Console (Ctrl+Shift+I) for MCP connection errors

### Models Not Downloading

Models auto-download on first use. If stuck:

```bash
# Check cache directory
ls -lh ~/.cache/qmd/models/

# Manually trigger download
qmd embed
```

If downloads fail, check internet connection and try again.

### Search Returns No Results

**Rebuild index**:
```bash
qmd embed -f
```

**Check collection status**:
```bash
qmd status
```

**Verify files are indexed**:
```bash
qmd collection list
qmd ls my-vault
```

### Performance Issues

**Reduce batch size** (if system runs out of memory):
- QMD uses sensible defaults, but very large vaults may need tuning
- Check available RAM and adjust collection size

**Use specific collections**:
```bash
# Instead of searching everything
qmd query "topic" -c specific-collection
```

---

## Privacy \u0026 Security

### Data Storage

QMD stores all data locally:

- **Index**: `~/.cache/qmd/index.sqlite`
- **Models**: `~/.cache/qmd/models/`
- **Configuration**: Embedded in index

No data is sent to external servers.

### Model Provenance

All models are from HuggingFace:
- `embeddinggemma-300M` by Google
- `qwen3-reranker` by Alibaba
- `qmd-query-expansion` fine-tuned by QMD author

Verify checksums in `~/.cache/qmd/models/` if concerned.

---

## Example Workflows

### Daily Note Search

```bash
# Find today's tasks
qmd query "tasks for today" -c daily-notes

# Get this week's journal entries
qmd multi_get "journals/2025-02-*.md"
```

### Research Assistant

```bash
# Semantic search for related concepts
qmd vsearch "transformer architecture explained"

# Get comprehensive results with sources
qmd query "attention mechanism papers" --all --min-score 0.5 --md
```

### Project Management

```bash
# Find all project notes
qmd search "project status" -c work

# Get meeting notes from last month
qmd multi_get "meetings/2025-01-*.md"
```

---

## FAQ

**Q: Can I use QMD with existing Orama indexes?**  
A: Yes! QMD and Orama are independent. Use QMD for private/offline search, Orama for fast remote search.

**Q: How often should I update the index?**  
A: Run `qmd update` when you've added/modified notes. Or set up a cron job for automatic updates.

**Q: Can I customize the embedding model?**  
A: Not currently. QMD uses fine-tuned models optimized for document search.

**Q: Does QMD work on Windows?**  
A: Yes, after installing Bun for Windows. SQLite extensions may require additional setup.

**Q: How much RAM does QMD need?**  
A: Minimum 4GB. 8GB+ recommended for large vaults (\u003e10,000 notes).

---

## Learn More

- **QMD GitHub**: https://github.com/tobi/qmd
- **MCP Protocol**: https://modelcontextprotocol.io
- **Bun Runtime**: https://bun.sh

---

**Made with 🔍 by the LLMSider Team**
