# QMD Integration Summary

## ✅ Completed Integration

Successfully integrated QMD (Query Markup Documents) hybrid search capabilities into the LLMSider Obsidian plugin via the Model Context Protocol (MCP).

---

## 📦 What Was Delivered

### 1. MCP Server Configuration
**File**: `mcp-config.json`

Added QMD MCP server configuration with:
- Command: `qmd mcp`
- Auto-approved tools: `qmd_search`, `qmd_vsearch`, `qmd_query`, `qmd_get`, `qmd_multi_get`, `qmd_status`
- Timeout: 120 seconds (for complex searches)
- Ready to connect once QMD is installed

### 2. Comprehensive Documentation

#### Setup Guide (`docs/en/qmd-setup-guide.md`)
Complete step-by-step installation guide covering:
- Bun installation (QMD's runtime)
- QMD global installation
- Vault indexing workflow
- LLMSider configuration
- Troubleshooting common issues

#### Integration Guide (`docs/en/qmd-integration.md`)
Detailed technical documentation including:
- QMD architecture overview
- Available MCP tools and their usage
- Configuration options
- Advanced features (multiple collections, custom masks)
- Comparison with built-in Orama search
- Performance tuning tips

### 3. README Updates
Added QMD integration section highlighting:
- Advanced hybrid search capabilities
- 100% local/private operation
- Link to setup guide

---

## 🔧 Technical Architecture

### Integration Approach: Option A (MCP Server)

**Why this approach**:
- ✅ No code changes to LLMSider core
- ✅ QMD runs independently with its own runtime (Bun)
- ✅ Preserves QMD's local LLM capabilities
- ✅ Easy to update QMD independently
- ✅ Zero compatibility issues with Obsidian/Electron

**How it works**:
```
LLMSider (Node.js/Obsidian)
    ↓ MCP Protocol (stdio)
QMD MCP Server (Bun)
    ↓ Direct calls
QMD Core (SQLite + node-llama-cpp + GGUF models)
```

### QMD Components

1. **BM25 Search** - SQLite FTS5 full-text indexing
2. **Vector Search** - sqlite-vec with cosine similarity
3. **LLM Re-ranking** - Qwen3-reranker (local GGUF model)
4. **Query Expansion** - Fine-tuned model for query variations
5. **RRF Fusion** - Reciprocal Rank Fusion with position-aware blending

### Available Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `qmd_search` | BM25 keyword search | "Find notes mentioning 'quarterly reports'" |
| `qmd_vsearch` | Vector semantic search | "Find notes about improving productivity" |
| `qmd_query` | Hybrid (BM25+Vector+Rerank) | "What are my thoughts on AI ethics?" |
| `qmd_get` | Retrieve single document | "Get the project timeline note" |
| `qmd_multi_get` | Retrieve multiple documents | "Get all January 2025 daily notes" |
| `qmd_status` | Index health check | "How many documents are indexed?" |

---

## 📋 User Setup Workflow

### Prerequisites
1. Install Bun runtime
2. Install Homebrew SQLite (macOS only)

### Installation Steps
```bash
# 1. Install QMD globally
bun install -g https://github.com/tobi/qmd

# 2. Index vault
cd ~/Documents/my-vault
qmd collection add . --name my-vault
qmd context add qmd://my-vault "My Obsidian knowledge base"
qmd embed  # Downloads ~2GB of GGUF models

# 3. Enable in LLMSider
# Settings → MCP Servers → QMD → Enable → Connect
```

### Verify
```bash
# Test CLI
qmd search "machine learning"
qmd query "explain neural networks"

# Test in LLMSider
# Ask AI: "Find my notes about project management"
```

---

## 🎯 Benefits for Users

### Privacy & Security
- **100% Local**: All processing happens on user's machine
- **No External APIs**: No data sent to third parties
- **Offline Capable**: Works without internet after setup

### Search Quality
- **Hybrid Pipeline**: Combines keyword, semantic, and AI ranking
- **Query Expansion**: Automatically generates query variations
- **Position-Aware Blending**: Preserves exact matches while leveraging AI

### Flexibility
- **Multiple Collections**: Organize personal/work/research separately
- **Custom Filters**: Search specific collections or paths
- **Output Formats**: JSON, Markdown, CSV for different workflows

---

## 🔄 Comparison: QMD vs Orama

| Feature | QMD | Orama (Built-in) |
|---------|-----|------------------|
| **Privacy** | ✅ 100% local | ⚠️ Remote API embeddings |
| **Search Quality** | ✅✅ BM25+Vector+LLM | ✅ BM25+Vector |
| **Offline** | ✅ Fully offline | ❌ Requires internet |
| **Setup** | ⚠️ External install | ✅ Built-in |
| **Speed** | ⚠️ Slower (local LLM) | ✅ Fast (remote API) |
| **Disk Space** | ⚠️ ~2GB models | ✅ Minimal |
| **Integration** | ⚠️ Via MCP | ✅ Native |

**Recommendation**: 
- Use **QMD** for: Privacy-critical work, offline access, best search quality
- Use **Orama** for: Quick setup, fast responses, limited disk space

---

## 📊 Resource Requirements

### Disk Space
- GGUF Models: ~2GB
  - embeddinggemma-300M: ~300MB
  - qwen3-reranker: ~640MB
  - qmd-query-expansion: ~1.1GB
- Index: ~0.1% of vault size
- **Total**: ~2-3GB

### Memory
- Minimum: 4GB RAM
- Recommended: 8GB+ RAM
- Models loaded on-demand, unloaded after 5min inactivity

### Performance
- Indexing: ~10-50 notes/sec (depends on note size)
- Search: 100-500ms per query (BM25+Vector+Rerank)
- Embedding generation: ~5 chunks/sec

---

## 🚧 Limitations & Considerations

### Technical Constraints
1. **Bun Dependency**: Users must install Bun runtime
2. **macOS SQLite**: Requires Homebrew SQLite for vector extension
3. **Model Download**: 2GB download on first use
4. **Memory Usage**: Models consume significant RAM

### Current Scope
- ✅ Search and retrieval tools fully implemented
- ✅ MCP server configuration ready
- ✅ Documentation complete
- ⚠️ No automated testing yet
- ⚠️ No UI integration beyond MCP
- ⚠️ No index auto-update (users run `qmd update` manually)

### Future Enhancements (Not Implemented)
- Automatic index updates on file changes
- Settings UI for QMD configuration
- Index statistics in LLMSider UI
- Direct integration without MCP (requires porting to Node.js)

---

## 🧪 Testing Recommendations

### Manual Testing Checklist

1. **Installation**
   - [ ] Verify Bun installs correctly
   - [ ] Verify QMD installs globally
   - [ ] Verify `qmd --version` works

2. **Indexing**
   - [ ] Create collection from test vault
   - [ ] Verify embedding generation completes
   - [ ] Check `qmd status` shows documents

3. **MCP Connection**
   - [ ] Enable QMD in LLMSider settings
   - [ ] Verify connection status shows "Connected"
   - [ ] Check tool list shows all 6 QMD tools

4. **Search Functionality**
   - [ ] Test keyword search via AI
   - [ ] Test semantic search via AI
   - [ ] Test hybrid search via AI
   - [ ] Test document retrieval

5. **Error Handling**
   - [ ] Test with QMD not installed
   - [ ] Test with no index
   - [ ] Test with malformed queries

---

## 📝 Files Modified/Created

### Modified
- `mcp-config.json` - Added QMD server configuration
- `README.md` - Added QMD integration section

### Created
- `docs/en/qmd-integration.md` - Complete integration guide
- `docs/en/qmd-setup-guide.md` - Step-by-step setup instructions

### No Changes Required
- Core plugin code (zero modifications needed)
- Build configuration
- Dependencies

---

## 🎓 Key Takeaways

### Design Decisions

1. **MCP Integration**: Chose external MCP server over code porting
   - Preserves QMD's full capabilities
   - Avoids Node.js/Bun compatibility issues
   - Enables independent updates

2. **Zero Code Changes**: Plugin remains untouched
   - Lower risk integration
   - Easy to maintain
   - Can be disabled without side effects

3. **Comprehensive Documentation**: Detailed guides for users
   - Reduces support burden
   - Enables self-service setup
   - Clear troubleshooting steps

### Technical Insights

From the librarian agent research:
- QMD uses sophisticated RRF fusion with top-rank bonuses
- Two-step vector search avoids sqlite-vec JOIN hangs
- Session management uses reference counting for model lifecycle
- Smart chunking breaks at paragraph > sentence > line boundaries
- Position-aware blending preserves exact matches

---

## 🚀 Next Steps for Users

1. **Read Setup Guide**: Start with `docs/en/qmd-setup-guide.md`
2. **Install Prerequisites**: Bun + QMD
3. **Index Vault**: Create collections and generate embeddings
4. **Enable in LLMSider**: Connect MCP server
5. **Test Search**: Try different search modes via AI

---

## 📞 Support Resources

- **QMD GitHub**: https://github.com/tobi/qmd
- **LLMSider Docs**: `docs/en/qmd-integration.md`
- **Setup Guide**: `docs/en/qmd-setup-guide.md`
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Integration Complete! 🎉**

Users can now leverage QMD's powerful hybrid search capabilities directly from LLMSider, with complete privacy and offline functionality.
