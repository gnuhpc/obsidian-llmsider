# 🗄️ Search Enhancement Guide

## Overview

LLMSider's Search Enhancement feature provides semantic search capabilities for your vault through embedding technology, allowing AI to automatically find and use relevant information. This is not traditional keyword search, but intelligent retrieval based on content semantic understanding.

---

## 🎯 What is Semantic Search?

### Traditional Search vs Semantic Search

**Traditional (Keyword) Search:**
```
Query: "artificial intelligence applications"
Matches: Notes containing these exact words
```

**Semantic Search:**
```
Query: "artificial intelligence applications"
Matches: Notes about:
  - Machine learning use cases
  - AI in healthcare
  - Neural network deployments
  - Even if they don't contain the exact words!
```

### How It Works

```
1. Your Notes → 2. Split into Chunks → 3. Convert to Vectors
   ┌─────────┐      ┌──────────┐        ┌───────────┐
   │ Note.md │ →    │ Chunk 1  │ →      │ [0.2, ... │
   │         │      │ Chunk 2  │        │ [0.5, ... │
   └─────────┘      └──────────┘        └───────────┘

4. Store in Local Index ← 5. AI Query ← 6. Get Relevant Context
   ┌────────────┐      ┌──────────┐       ┌───────────┐
   │ Orama Index│ ←    │  Query   │  ←   │ AI finds  │
   │ Indexed    │      │  Vector  │       │ similar   │
   └────────────┘      └──────────┘       └───────────┘
```

---

## 🚀 Setup Guide

### Step 1: Enable Search Enhancement

1. **Open Settings**
   - Settings → LLMSider → Search Enhancement

2. **Enable Enhanced Search**
   - Toggle "Enable Enhanced Search" switch
   - System will begin background embedding processing

3. **Configure Embedding Model**
   - Choose an embedding provider:
     - **OpenAI** (text-embedding-3-small) - Recommended, high quality
     - **Local Transformer Models** (free, privacy-friendly)
     - **Ollama** (runs locally)

### Step 2: Choose Embedding Provider

#### Option A: OpenAI (Recommended)

**Setup:**
1. Create OpenAI connection (if not exists)
2. Add embedding model:
   ```yaml
   Model Name: text-embedding-3-small
   Type: Embedding
   Dimensions: 1536
   ```

**Pros:**
- ✅ High-quality semantic understanding
- ✅ Fast
- ✅ Stable and reliable
- ✅ Good cost/performance ratio

**Cons:**
- ❌ Requires API key
- ❌ Data sent to OpenAI
- ❌ Small usage costs

#### Option B: Local Transformer Models (Free)

**Setup:**
1. Model downloads automatically on first use
2. Stored locally, runs completely offline
3. Recommended model:
   ```yaml
   Xenova/all-MiniLM-L6-v2
   Dimensions: 384
   ```

**Pros:**
- ✅ Completely free
- ✅ Privacy-friendly (local processing)
- ✅ No API key needed
- ✅ Works offline

**Cons:**
- ❌ Initial model download takes time
- ❌ Slightly lower quality than OpenAI
- ❌ Uses local storage space

#### Option C: Ollama (Local)

**Setup:**
1. Install Ollama
2. Pull embedding model:
   ```bash
   ollama pull mxbai-embed-large
   ```
3. Configure LLMSider:
   ```yaml
   Connection: Ollama
   Model: mxbai-embed-large
   Dimensions: 1024
   ```

**Pros:**
- ✅ Free
- ✅ Private (local)
- ✅ No API needed
- ✅ Fast with good hardware

**Cons:**
- ❌ Requires local compute resources
- ❌ More complex setup

### Step 3: Configure Chunking Strategy

LLMSider offers two chunking strategies:

#### 1. Semantic Chunking (Recommended)
```yaml
Strategy: Semantic Chunking
Description: Automatically splits based on document structure (headings, paragraphs)
Advantages: Maintains semantic coherence, no manual configuration needed
Best for: Structured Markdown notes
```

#### 2. Character Chunking
```yaml
Strategy: Character Chunking
Chunk Size: 1000 (default, range 100-5000)
Chunk Overlap: 100 (default, must be less than chunk size)
Best for: Scenarios requiring precise chunk granularity control
```

### Step 4: Initial Index Build

1. Click "Rebuild Index (Full)"
2. Wait for completion (progress shown)
3. Index is ready!

**Progress Indicator:**
```
📊 Indexing vault...
─────────────────────────────── 45%
Processing file 125 / 280
Indexing chunk 567 / 1247
```

---

## 🎨 Core Features

### 1. Similar Notes Display

**Enable in settings:**
```yaml
Show Similar Notes: ✓
Hide Similar Notes by Default: ✓ (show on hover)
```

**Effect:**
- Shows semantically related notes at bottom of current note
- Automatically sorted by content similarity
- Click to quickly jump

```
┌─────────────────────────────┐
│ 📊 Similar Notes (3)        │
├─────────────────────────────┤
│ 🔗 ML Fundamentals (92%)    │
│ 🔗 Neural Networks (87%)    │
│ 🔗 AI Ethics (81%)          │
└─────────────────────────────┘
```

### 2. AI Conversation Auto-Enhancement

**In chat:**
```
You: "Did I write anything about project management?"
     ↓
Search enhancement automatically finds relevant notes
     ↓
AI answers based on found note content
```

**Visual Comparison:**

Without local search enhancement:
![Search Enhancement Disabled](../../screenshots/search-enhancement-disabled.png)

With local search enhancement enabled:
![Search Enhancement Enabled](../../screenshots/search-enhancement-enabled.png)

As you can see, when search enhancement is enabled, the AI automatically finds relevant information from your vault (shown as "Relevant information found by local search") and provides more accurate, personalized responses based on your local knowledge.

### 3. Related File Smart Suggestions

**When adding context:**
```
You add: "project-planning.md"
AI suggests: 💡 Related files (5s to add):
    - agile-workflow.md
    - task-management.md
    - team-collaboration.md
```

### 4. Speed Reading Enhancement

With search enhancement enabled, speed reading reports will automatically:
- Reference relevant content from your vault
- Recommend related notes in "Extended Reading"
- Provide richer contextual information

---

## ⚙️ Advanced Configuration

### Search Results Settings

```yaml
Search Results Count: 5 (default)
  - Number of similar chunks returned per search
  - Range: 1-20

Context Excerpt Length: 500 (default)
  - Maximum characters per excerpt sent to AI
  - Set to 0 to send full chunk content
  - Shorter excerpts reduce token usage
```

### File Filters

**Include Patterns:**
```yaml
- "**/*.md"       # All Markdown files
- "**/*.txt"      # Text files
```

**Exclude Patterns:**
```yaml
- "**/templates/**"  # Template folders
- "**/.obsidian/**"  # Obsidian config
- "**/archive/**"    # Archived content
```

### Performance Optimization

**Index Performance:**
```yaml
Batch Size: 10          # Files processed at once
Parallel Processing: 4  # Concurrent operations
```

**Search Performance:**
```yaml
Cache Timeout: 3600s    # Search result cache duration
Minimum Similarity: 0.7 # Similarity threshold (0-1)
```

---

## 📊 Index Management

### Update Index (Differential Sync)

**Incremental Update:**
```
Command: "Update Index (Differential)"
Action: Only updates files modified since last sync
Speed: Fast (seconds)
Use: Daily usage
```

### Rebuild Index (Full Rebuild)

**Full Rebuild:**
```
Command: "Rebuild Index (Full)"
Action: Clears and rebuilds all indexes from scratch
Speed: Slower (minutes)
Use: After changing embedding model or chunking strategy
```

### View Index Status

**Statistics:**
```
Total Files: 280
Vector Chunks: 1,247
Index Size: 12.4 MB
Last Sync: 5 minutes ago
Status: 🟢 Up to date
```

**Pause/Resume Indexing:**
- Pause indexing anytime during process
- Resume incomplete indexing after pause
- No loss of already indexed content

---

## 💰 Cost Considerations

### Embedding Costs

**OpenAI Pricing:**
```
text-embedding-3-small: $0.02 / 1M tokens

Example vault (1000 notes, 500K words):
  ≈ 670K tokens
  Initial index cost: ~$0.013 (one-time)
  
Daily updates (10 notes/day):
  ≈ 6.7K tokens/day
  Monthly cost: ~$0.05/month
```

**Local Transformer Models:**
```
Completely free
No API costs
Only local storage and compute resources
```

**Ollama:**
```
Free (hardware costs only)
No API call fees
```

---

## 🐛 Troubleshooting

### Index Build Issues

**Issue: Index build fails**
```
Error: Cannot embed file: large-file.md
```

**Solutions:**
1. ✅ Check file size, exclude oversized files
2. ✅ Reduce chunk size
3. ✅ Check if embedding model is working
4. ✅ Check console error logs

**Issue: Slow indexing**
```
Progress: 10 files/min (expected: 50/min)
```

**Solutions:**
1. ✅ Use local Transformer models (faster)
2. ✅ Increase parallel processing count
3. ✅ Exclude unnecessary files
4. ✅ Check network connection (if using remote API)

### Search Issues

**Issue: No similar notes found**
```
Current note: Machine Learning Intro
Similar notes: None found
```

**Solutions:**
1. ✅ Confirm "Show Similar Notes" is enabled
2. ✅ Lower similarity threshold
3. ✅ Check if notes are indexed
4. ✅ Try rebuilding index

**Issue: Irrelevant search results**
```
Query: "project management"
Results: Shows unrelated notes
```

**Solutions:**
1. ✅ Increase similarity threshold
2. ✅ Use better embedding model (OpenAI)
3. ✅ Check if chunking strategy is appropriate
4. ✅ Ensure note content quality

---

## 📚 Best Practices

### 🎯 Indexing Strategy

1. **Start with Core Content**
   - Index important knowledge notes first
   - Exclude temporary files and drafts
   - Gradually expand index scope

2. **Regular Maintenance**
   - Weekly differential sync
   - Monthly full rebuild or after model changes
   - Clean up unneeded notes

3. **Quality Over Quantity**
   - Keep note structure clear
   - Use meaningful headings and paragraphs
   - Exclude low-value content

### 🚀 Usage Tips

1. **Combine Manual Context**
   - Search enhancement + manually add files
   - Cross-validate relevance
   - Leverage related file suggestions

2. **Optimize Chunking Strategy**
   - Use semantic chunking for structured notes
   - Consider character chunking for long documents
   - Adjust based on actual results

3. **Monitor Performance**
   - Regularly check index statistics
   - Pay attention to search quality
   - Adjust parameters as needed

---

## 🔒 Privacy & Security

### Data Storage

- **Local First**: All vector indexes stored locally (`.obsidian/plugins/obsidian-llmsider/vector-data/`)
- **Optional Remote**: Only when using OpenAI embedding, raw text sent to API for vectorization
- **Fully Offline**: When using local Transformer models, all processing done locally

### Recommended Configurations

**High Privacy Requirements:**
```yaml
Embedding Model: Local Transformer Models
Chunking Strategy: Semantic Chunking
Data Transfer: Zero
```

**Balance Performance & Privacy:**
```yaml
Embedding Model: OpenAI (only sent during vectorization)
Other Processing: All local
Real-time Chat: AI doesn't auto-access index
```

---

## 📖 Related Guides

- [Connections & Models](connections-and-models.md) - Embedding model configuration
- [Chat Interface](chat-interface.md) - Using search enhancement in conversations
- [Speed Reading](speed-reading.md) - How speed reading leverages search enhancement
- [Settings Guide](settings-guide.md) - Complete configuration reference

---

**Need Help?** [GitHub Issues](https://github.com/gnuhpc/obsidian-llmsider/issues)
