# 🗄️ Vector Database Guide

## Overview

LLMSider's Vector Database enables semantic search across your entire vault, allowing AI to find and use relevant information automatically. Think of it as giving your AI a photographic memory of your notes.

---

## 🎯 What is Vector Search?

### Traditional Search vs Vector Search

**Traditional (Keyword) Search:**
```
Query: "artificial intelligence applications"
Matches: Notes containing these exact words
```

**Vector (Semantic) Search:**
```
Query: "artificial intelligence applications"
Matches: Notes about:
  - Machine learning use cases
  - AI in healthcare
  - Neural network deployments
  - Even if they don't contain exact words!
```

### How It Works

```
1. Your Notes → 2. Split into Chunks → 3. Convert to Vectors
   ┌─────────┐      ┌──────────┐        ┌───────────┐
   │ Note.md │ →    │ Chunk 1  │ →      │ [0.2, ... │
   │         │      │ Chunk 2  │        │ [0.5, ... │
   └─────────┘      └──────────┘        └───────────┘

4. Store in Database ← 5. Query with AI ← 6. Get Relevant Context
   ┌────────────┐      ┌──────────┐       ┌───────────┐
   │ Vector DB  │ ←    │  Query   │  ←   │ AI finds  │
   │ Indexed    │      │  Vector  │       │ similar   │
   └────────────┘      └──────────┘       └───────────┘
```

---

## 🚀 Setup Guide

### Step 1: Enable Vector Database

1. **Open Settings**
   - Settings → LLMSider → Vector Database

2. **Enable Vector Database**
   - Toggle "Enable Vector Database" switch
   - Wait for initialization

3. **Configure Embedding Model**
   - Choose an embedding provider:
     - **OpenAI** (text-embedding-3-small) - Recommended
     - **Hugging Face** (free, local)
     - **Local** (via Ollama)

### Step 2: Choose Embedding Provider

#### Option A: OpenAI (Recommended)

**Setup:**
1. Create OpenAI connection (if not exists)
2. Add embedding model:
   ```yaml
   Model Name: text-embedding-3-small
   Type: Embedding
   Dimension: 1536
   ```

**Pros:**
- ✅ High quality
- ✅ Fast
- ✅ Reliable
- ✅ Good cost/performance

**Cons:**
- ❌ Requires API key
- ❌ Sends data to OpenAI
- ❌ Small cost per embedding

#### Option B: Hugging Face (Free)

**Setup:**
1. Create Hugging Face connection
2. Add embedding model:
   ```yaml
   Model: sentence-transformers/all-MiniLM-L6-v2
   Type: Embedding
   Dimension: 384
   ```

**Pros:**
- ✅ Free
- ✅ No API key needed
- ✅ Privacy-friendly

**Cons:**
- ❌ Slower than OpenAI
- ❌ Lower quality
- ❌ Rate limits

#### Option C: Local (Ollama)

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
   Dimension: 1024
   ```

**Pros:**
- ✅ Free
- ✅ Private (local)
- ✅ No API needed
- ✅ Fast (with good hardware)

**Cons:**
- ❌ Requires local resources
- ❌ Setup complexity

### Step 3: Configure Indexing

**Chunking Strategy:**
```yaml
Strategy: semantic  # or: fixed, paragraph
Chunk Size: 512     # tokens per chunk
Overlap: 50         # token overlap between chunks
```

**File Filters:**
```yaml
Include Patterns:
  - "**/*.md"       # All markdown files
  - "**/*.txt"      # Text files
  
Exclude Patterns:
  - "**/templates/**"  # Template folder
  - "**/.obsidian/**"  # Obsidian config
```

### Step 4: Initial Index Build

1. Click "Rebuild Index"
2. Wait for completion (shows progress)
3. Index is ready!

**Progress Indicator:**
```
📊 Indexing vault...
─────────────────────────────── 45%
125 / 280 files processed
```

---

## 🎨 Features

### 1. Automatic Context Enhancement

**Enable in Settings:**
```yaml
Auto-Search: Enabled
Max Results: 3
Similarity Threshold: 0.7
```

**What Happens:**
```
You: "What did I write about machine learning?"
     ↓
Vector DB finds 3 most relevant notes
     ↓
AI response uses this context automatically
```

### 2. Similar Notes Discovery

**View Similar Notes:**
- Sidebar panel shows related notes
- Updates as you type/navigate
- Click to open

```
┌─────────────────────────────┐
│ 📊 Similar Notes            │
├─────────────────────────────┤
│ 🔗 ML Basics (92%)          │
│ 🔗 Neural Networks (87%)    │
│ 🔗 AI Ethics (81%)          │
└─────────────────────────────┘
```

### 3. Related File Suggestions

**During Chat:**
```
You: "Tell me about productivity"
AI: 💡 Related files:
    - productivity-system.md
    - gtd-workflow.md
    - time-management.md
    
    Would you like me to include these?
```

### 4. Manual Search

**Command Palette:**
```
Cmd+P → "Vector: Search vault"
```

**Search Results:**
```markdown
Query: "project management"

Results:
1. Project Planning Template (95%)
   Preview: "...effective project management requires..."
   
2. Agile Methodology (89%)
   Preview: "...managing projects with agile..."
```

---

## ⚙️ Configuration

### Chunking Strategies

#### 1. Semantic Chunking (Recommended)
```yaml
Strategy: semantic
Description: Split by meaning/topics
Best For: Mixed content, natural notes
```

**Example:**
```markdown
# Machine Learning Basics
This section covers ML fundamentals...
[Chunk 1: Introduction to ML]

## Types of Learning
There are three main types...
[Chunk 2: Learning types]

## Applications
ML is used in many fields...
[Chunk 3: Applications]
```

#### 2. Fixed Size Chunking
```yaml
Strategy: fixed
Chunk Size: 512
Overlap: 50
Best For: Consistent chunk sizes
```

**Example:**
```markdown
[Chunk 1: First 512 tokens]
[Chunk 2: Tokens 462-974 (50 token overlap)]
[Chunk 3: Tokens 924-1436]
```

#### 3. Paragraph Chunking
```yaml
Strategy: paragraph
Description: Split by paragraphs
Best For: Well-structured documents
```

**Example:**
```markdown
Paragraph 1: Introduction
[Chunk 1]

Paragraph 2: Details
[Chunk 2]

Paragraph 3: Conclusion
[Chunk 3]
```

### Performance Settings

**Indexing:**
```yaml
Batch Size: 10          # Files processed at once
Parallel Processing: 4   # Concurrent operations
Rate Limit: 100/min     # API calls per minute
```

**Search:**
```yaml
Max Results: 5          # Results per query
Min Similarity: 0.7     # Threshold (0-1)
Cache TTL: 3600        # Cache time (seconds)
```

---

## 💡 Usage Patterns

### Pattern 1: Research Assistant

**Setup:**
```yaml
Auto-Search: Enabled
Max Results: 5
Include Folders: ["Research/", "Papers/"]
```

**Usage:**
```
You: "Summarize my research on climate change"
AI: [Automatically includes relevant papers]
    Based on your notes... [comprehensive summary]
```

### Pattern 2: Knowledge Discovery

**Setup:**
```yaml
Similar Notes: Enabled
Auto-Suggest: Enabled
Threshold: 0.8
```

**Usage:**
```
[Working on "Project A" note]
Sidebar: 💡 Similar notes found:
  - Previous Project B (similar challenges)
  - Resource List (relevant tools)
```

### Pattern 3: Writing Enhancement

**Setup:**
```yaml
Auto-Search: Enabled
Context Timeout: 5000ms
Max Context Size: 10KB
```

**Usage:**
```
You: "Write about productivity methods"
AI: [Finds your existing notes on GTD, Pomodoro, etc.]
    Here's a comprehensive guide combining your methods...
```

---

## 📊 Index Management

### Sync Index

**Incremental Sync:**
```
Command: "Vector: Sync Index"
Updates: Only changed files since last sync
Speed: Fast (seconds)
```

### Rebuild Index

**Full Rebuild:**
```
Command: "Vector: Rebuild Index"
Updates: All files
Speed: Slow (minutes)
When: After changing embedding model or chunk size
```

### Check Status

**Index Statistics:**
```
Total Files: 280
Total Chunks: 1,247
Index Size: 12.4 MB
Last Sync: 5 minutes ago
Status: 🟢 Up to date
```

---

## 🔧 Advanced Configuration

### Custom Similarity Function

```typescript
// config: cosine (default), euclidean, dot
similarityFunction: "cosine"
```

### Embedding Caching

```yaml
Cache Embeddings: true
Cache Location: .obsidian/plugins/llmsider/vector-cache/
Max Cache Size: 500MB
```

### File Prioritization

```yaml
# Higher weight = more important
File Weights:
  "projects/*.md": 1.5
  "archive/*.md": 0.5
  "*.md": 1.0
```

---

## 🐛 Troubleshooting

### Index Build Issues

**Problem: Index build fails**
```
Error: Failed to embed file: out-of-memory.md
```

**Solutions:**
1. ✅ Reduce batch size
2. ✅ Skip large files
3. ✅ Increase chunk size
4. ✅ Check embedding model

**Problem: Slow indexing**
```
Progress: 10 files/minute (expected: 50/min)
```

**Solutions:**
1. ✅ Increase parallel processing
2. ✅ Use faster embedding model
3. ✅ Enable caching
4. ✅ Exclude unnecessary files

### Search Issues

**Problem: No results found**
```
Query: "machine learning"
Results: 0 matches
```

**Solutions:**
1. ✅ Lower similarity threshold
2. ✅ Try synonyms
3. ✅ Check if files are indexed
4. ✅ Rebuild index

**Problem: Irrelevant results**
```
Query: "project planning"
Results: Random notes
```

**Solutions:**
1. ✅ Increase similarity threshold
2. ✅ Use more specific query
3. ✅ Adjust file weights
4. ✅ Improve chunking strategy

---

## 💰 Cost Considerations

### Embedding Costs

**OpenAI Pricing:**
```
text-embedding-3-small: $0.02 / 1M tokens

Example vault (1000 notes, 500K words):
  ≈ 667K tokens
  Cost: ~$0.013 (one-time)
  
Updates (10 notes/day):
  ≈ 6.7K tokens/day
  Cost: ~$0.05/month
```

**Hugging Face:**
```
Free (with rate limits)
10,000 requests/month free tier
```

**Local (Ollama):**
```
Free (hardware costs only)
No API costs
```

### Optimization Tips

1. **Exclude Unnecessary Files**
   ```yaml
   Exclude:
     - "templates/**"
     - "archive/**"
     - "*.excalidraw"
   ```

2. **Cache Embeddings**
   ```yaml
   Cache: Enabled
   Cache Time: 30 days
   ```

3. **Batch Processing**
   ```yaml
   Batch Size: 20  # Larger batches = fewer API calls
   ```

---

## 📚 Best Practices

### 🎯 Indexing Strategy

1. **Start Small**
   - Index important folders first
   - Expand gradually
   - Monitor performance

2. **Regular Syncs**
   - Enable auto-sync
   - Sync after major changes
   - Monthly full rebuilds

3. **Quality Over Quantity**
   - Exclude low-value files
   - Focus on reference material
   - Keep notes well-structured

### 🚀 Search Strategy

1. **Specific Queries**
   ```
   ❌ "information"
   ✅ "machine learning applications in healthcare"
   ```

2. **Use Context**
   - Combine with manual context
   - Cross-reference results
   - Verify relevance

3. **Iterate**
   - Start broad, refine
   - Try different phrasings
   - Adjust threshold

---

## 📖 Related Guides

- [Connections & Models](connections-and-models.md) - Embedding setup
- [Chat Interface](chat-interface.md) - Using vector search in chat
- [Settings Guide](settings-guide.md) - Configuration reference
- [Troubleshooting](troubleshooting.md) - Common issues

---

**Need Help?** [GitHub Issues](https://github.com/llmsider/obsidian-llmsider/issues) | [Discord](https://discord.gg/llmsider)
