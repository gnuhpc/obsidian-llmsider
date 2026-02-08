# 🚀 QMD Setup Guide

This guide walks you through setting up QMD (Query Markup Documents) integration with LLMSider.

---

## What You'll Get

- **100% Local Search**: All data and AI models run on your machine
- **Hybrid Search Quality**: BM25 + Vector + LLM reranking for best results
- **Privacy First**: No data sent to external servers
- **Offline Capable**: Works without internet after setup

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **RAM** | 4GB | 8GB+ |
| **Disk Space** | 3GB free | 5GB+ free |
| **OS** | macOS, Linux, or Windows | macOS (best support) |

### Required Software

1. **Bun** (QMD's runtime)
2. **Homebrew SQLite** (macOS only, for vector extension support)

---

## Step-by-Step Installation

### 1. Install Bun

Bun is a fast JavaScript runtime required for QMD.

**macOS / Linux**:
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell as Administrator)**:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify installation**:
```bash
bun --version
# Should output: 1.x.x
```

### 2. Install Homebrew SQLite (macOS Only)

QMD requires SQLite with extension support, which isn't included in macOS by default.

```bash
brew install sqlite
```

**Verify**:
```bash
which sqlite3
# Should output: /opt/homebrew/bin/sqlite3 (or similar)
```

### 3. Install QMD Globally

```bash
bun install -g https://github.com/tobi/qmd
```

**Verify**:
```bash
qmd --version
# Should output version number
```

**Troubleshooting**: If `qmd` command not found:

```bash
# Add Bun's bin directory to PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or source ~/.zshrc

# Try again
qmd --version
```

---

## Indexing Your Vault

### Quick Start

1. **Navigate to your Obsidian vault**:
   ```bash
   cd ~/Documents/my-vault
   ```

2. **Create a QMD collection**:
   ```bash
   qmd collection add . --name my-vault
   ```

3. **Add context** (helps QMD understand your content):
   ```bash
   qmd context add qmd://my-vault "My Obsidian knowledge base"
   ```

4. **Generate embeddings**:
   ```bash
   qmd embed
   ```
   
   **Note**: This will download ~2GB of GGUF models on first run:
   - `embeddinggemma-300M` (~300MB) - for embeddings
   - `qwen3-reranker` (~640MB) - for reranking
   - `qmd-query-expansion` (~1.1GB) - for query expansion
   
   Models are cached in `~/.cache/qmd/models/`.

### Verify Index

```bash
# Check status
qmd status

# Should show:
# - Total documents indexed
# - Total chunks
# - Disk size
# - Collections
```

### Test Search

```bash
# Keyword search
qmd search "machine learning"

# Semantic search
qmd vsearch "how to learn AI"

# Hybrid search (best quality)
qmd query "explain neural networks"
```

---

## Enable in LLMSider

### 1. Open LLMSider Settings

1. Open **Obsidian Settings** (⚙️)
2. Navigate to **LLMSider** → **MCP Servers**

### 2. Find QMD Server

Scroll down to find **qmd** in the server list.

### 3. Enable and Connect

1. Toggle **Enabled** to ON
2. Click **Connect**
3. Wait for connection status to show ✅ **Connected**

### 4. Verify Tools

Once connected, you should see these tools available:
- `qmd_search` - Keyword search
- `qmd_vsearch` - Semantic search
- `qmd_query` - Hybrid search
- `qmd_get` - Get document
- `qmd_multi_get` - Get multiple documents
- `qmd_status` - Index status

---

## Using QMD with AI

### Example Prompts

Now you can ask the AI to search your vault using QMD:

**Keyword Search**:
```
Find all my notes about project management
```

**Semantic Search**:
```
What have I written about improving productivity?
```

**Hybrid Search** (best quality):
```
Show me my thoughts on AI ethics and safety
```

**Retrieve Specific Notes**:
```
Get my note about quarterly planning
```

**Retrieve Multiple Notes**:
```
Show me all my daily notes from January 2025
```

### How It Works

When you ask these questions, the AI will:
1. Determine which QMD tool to use
2. Execute the search/retrieval
3. Present results to you
4. Optionally read the full content if needed

---

## Advanced Configuration

### Multiple Collections

Organize different types of content:

```bash
# Personal notes
cd ~/notes
qmd collection add . --name personal
qmd context add qmd://personal "Personal knowledge base"

# Work documentation
cd ~/work-docs
qmd collection add . --name work
qmd context add qmd://work "Work documentation"

# Research
cd ~/research
qmd collection add . --name research
qmd context add qmd://research "Academic papers"

# Index all
qmd embed
```

### Custom Collection Masks

By default, QMD indexes all Markdown files. Customize with `--mask`:

```bash
# Only index files in 'notes' subdirectory
qmd collection add ~/vault --name vault --mask "**/notes/**/*.md"

# Exclude drafts
qmd collection add ~/vault --name vault --mask "**/*.md" --exclude "**/drafts/**"
```

### Index Management

```bash
# Update index (incremental)
qmd update

# Update with git pull first
qmd update --pull

# Force rebuild (e.g., after model change)
qmd embed -f

# Clean up
qmd cleanup
```

### Performance Tuning

For large vaults (\u003e10,000 notes):

1. **Increase search limits**:
   ```bash
   qmd query "topic" -n 50  # Get 50 results instead of 5
   ```

2. **Use collection filters**:
   ```bash
   qmd query "API design" -c work  # Search only 'work' collection
   ```

3. **Set minimum score thresholds**:
   ```bash
   qmd query "topic" --min-score 0.4  # Only results scoring \u003e 0.4
   ```

---

## Updating QMD

### Check for Updates

```bash
# Check current version
qmd --version

# Check GitHub for latest release
# https://github.com/tobi/qmd/releases
```

### Update QMD

```bash
# Reinstall latest version
bun install -g https://github.com/tobi/qmd
```

**Note**: Your index and collections are preserved during updates.

---

## Troubleshooting

### Common Issues

#### "qmd: command not found"

**Solution**: Add Bun's bin directory to PATH:
```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### MCP Connection Failed

**Check QMD installation**:
```bash
qmd --version
```

**Test MCP server manually**:
```bash
qmd mcp
# Should start server. Press Ctrl+C to stop.
```

**Check LLMSider logs**:
1. Settings → LLMSider → Advanced → Debug Mode → Enable
2. Open Console (Ctrl+Shift+I / Cmd+Option+I)
3. Look for MCP connection errors

#### Models Not Downloading

**Check internet connection** and retry:
```bash
qmd embed -f
```

**Check cache directory**:
```bash
ls -lh ~/.cache/qmd/models/
# Should show three .gguf files
```

**Manual download** (if automatic fails):
1. Visit https://huggingface.co/ggml-org/embeddinggemma-300M-GGUF
2. Download `embeddinggemma-300M-Q8_0.gguf`
3. Place in `~/.cache/qmd/models/`

#### Search Returns No Results

**Rebuild index**:
```bash
qmd embed -f
```

**Verify collection**:
```bash
qmd collection list
qmd ls my-vault  # List files in collection
```

**Check file count**:
```bash
qmd status
# Should show \u003e 0 documents
```

#### Out of Memory During Embedding

**Solution**: Close other applications and retry. QMD loads models into RAM.

For very large vaults:
1. Split into smaller collections
2. Index one collection at a time
3. Increase system swap space

#### SQLite Extension Error (macOS)

**Error**: "Could not load sqlite-vec extension"

**Solution**: Ensure Homebrew SQLite is installed and in PATH:
```bash
brew install sqlite
which sqlite3  # Should show /opt/homebrew/bin/sqlite3
```

---

## Uninstalling QMD

### Remove QMD

```bash
bun pm uninstall -g qmd
```

### Remove Data

```bash
# Remove index and models
rm -rf ~/.cache/qmd/

# Remove collection configurations
# (stored in index.sqlite, so already removed above)
```

### Remove Bun (Optional)

```bash
rm -rf ~/.bun
```

---

## FAQ

**Q: Can I use QMD alongside the built-in Orama search?**  
A: Yes! They're independent. Use QMD for private/offline search, Orama for fast remote search.

**Q: How often should I update the index?**  
A: Run `qmd update` daily, or after adding many notes. Set up a cron job for automatic updates:
```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd ~/my-vault && qmd update
```

**Q: Can I share my QMD index with others?**  
A: The index contains your note content, so only share if you trust the recipient. The index is in `~/.cache/qmd/index.sqlite`.

**Q: Does QMD modify my notes?**  
A: No. QMD is read-only—it creates a search index but never modifies your original files.

**Q: Can I customize the GGUF models?**  
A: Not currently. QMD uses fine-tuned models optimized for document search.

**Q: What's the difference between `search`, `vsearch`, and `query`?**
- `search`: Fast BM25 keyword matching (like Ctrl+F across all notes)
- `vsearch`: Semantic similarity (understands meaning, finds related concepts)
- `query`: Hybrid (BM25 + vector + LLM reranking) - best quality, slowest

**Q: How much disk space do I need?**
- QMD models: ~2GB
- Index: ~0.1% of vault size (e.g., 100MB vault = ~100KB index)
- Total: ~2-3GB

**Q: Can I run QMD on Windows?**  
A: Yes, after installing Bun for Windows. SQLite vector extension support may vary.

---

## Next Steps

- Read the [QMD Integration Guide](qmd-integration.md) for detailed usage
- Explore [QMD GitHub](https://github.com/tobi/qmd) for advanced features
- Join the community discussions for tips and tricks

---

**Happy searching! 🔍**
