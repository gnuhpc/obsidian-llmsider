# 🧩 Skills & Skills Market

Skills are specialized AI capabilities in LLMSider that combine instructions, prompts, and a specific set of tools to handle complex tasks. They follow a standardized format compatible with [agentskills.io](https://agentskills.io).

---

## 🎯 What are Skills?

A **Skill** is a self-contained directory containing:
- `SKILL.md` or `skill.json`: Manifest file defining the skill's identity and permissions
- **Instructions**: Specific system prompts for the AI when this skill is active
- **Prompt Templates**: Reusable shortcuts for common tasks within the skill
- **Tool Allowlist**: Specific tools (built-in or MCP) that this skill is authorized to use

### Why use Skills?

| Feature | Standard Chat | Skills |
|---------|---------------|--------|
| **System Identity** | Generic assistant | Specialized expert (e.g. Researcher, Coder) |
| **Tool Scoping** | All enabled tools | Only tools relevant to the task |
| **Shortcuts** | Manual prompts | Targeted prompt templates |
| **Context Aware** | Vault-wide | Highly targeted instructions |

---

## 🚀 Skills Market

The **Skills Market** is a built-in gallery where you can discover and install community-created skills.

### How to use the Market:
1. Open **Settings** → **LLMSider** → **Skills Market**
2. Browse or search for skills (e.g., "Web Research", "Code Reviewer", "Daily Journaling")
3. Click **Install/Download** to add the skill to your local vault
4. Installed skills appear in your **Local Skills** list and the chat interface

---

## 📂 Local Skills

Your installed skills are stored in a designated folder in your vault (default: `skills/`).

### Managing Local Skills:
1. Go to **Settings** → **LLMSider** → **Local Skills**
2. **Enable/Disable**: Toggle individual skills on or off
3. **Default Skill**: Set a skill to automatically activate for new conversations
4. **Reload**: Scan the skills directory for manual changes

---

## 🛠️ Creating Your Own Skill

You can build custom skills by creating a folder in your `skills/` directory with a `SKILL.md` file.

### SKILL.md Example:

```markdown
---
name: Tech Researcher
id: tech-researcher
description: A specialized skill for deep technical research and documentation.
version: 1.0.0
allowed-tools: brave_web_search, read_url, write_file
metadata:
  preferred-mode: agent
---

You are a Senior Technical Researcher. Your goal is to provide deep, accurate, and well-cited technical analysis.

When performing research:
1. Use Brave Search to find latest information.
2. Read the most relevant pages thoroughly.
3. Synthesize the findings into a clear Obsidian note.
```

### Manifest Fields:
- `id`: Unique identifier (e.g., `my-custom-skill`)
- `name`: Display name in the UI
- `description`: A short summary of what the skill does
- `allowed-tools`: Space-separated list of tool names (e.g., `list_dir read_file`)
- `instructions`: (Optional) System instructions. If omitted, the text after the frontmatter is used.
- `metadata.preferred-mode`: `normal` or `agent`.

---

## 💬 Using Skills in Chat

### Manual Activation:
1. In the chat interface, click the **Mode/Skill** selector in the toolbar.
2. Select a skill from the list.
3. The AI will now follow the skill's instructions and have access only to its allowed tools.

### Automatic Routing:
LLMSider can automatically detect which skill is best suited for your input.
- If you ask "Search the web for LLM trends", it can automatically activate the "Web Researcher" skill.
- This behavior is controlled by the **Skill Routing** settings.

### Skill Prompts:
Skills can provide specialized prompt buttons. For example, a "Journaling" skill might have buttons for "Morning Reflection" or "Nightly Review".

---

## 💡 Best Practices

1. **Keep Tools Limited**: Only allow tools a skill actually needs to improve AI accuracy and safety.
2. **Clear Instructions**: Use the `SKILL.md` body to provide clear, personality-driven instructions.
3. **Use Prompt Templates**: Add common actions as templates to save typing.
4. **Skills Market**: Periodically check the market for updates to your favorite community skills.
