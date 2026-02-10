#!/bin/bash

set -e

REPO="gnuhpc/obsidian-LLMSider"
VERSION="1.0.2"

echo "Step 1: Attempting to push commits (this may take a while)..."
timeout 60 git push origin main || echo "Push timed out or failed, but continuing..."

echo "Step 2: Pushing tag ${VERSION}..."
timeout 30 git push origin ${VERSION} || echo "Tag push timed out or failed, but continuing..."

echo "Step 3: Creating GitHub release using gh CLI..."
gh release create ${VERSION} \
  --repo ${REPO} \
  --title "LLMSider v${VERSION}" \
  --notes "## LLMSider v${VERSION}

### Obsidian Plugin Files
This release includes the required files for Obsidian plugin installation:
- **main.js** - Plugin code (15 MB)
- **manifest.json** - Plugin manifest  
- **styles.css** - Plugin styles (321 KB)

### Installation via BRAT
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repository: \`gnuhpc/obsidian-LLMSider\`
3. Enable LLMSider in Community Plugins

### Manual Installation
1. Download \`main.js\`, \`manifest.json\`, and \`styles.css\`
2. Create folder: \`YourVault/.obsidian/plugins/llmsider/\`
3. Place the three files in this folder
4. Reload Obsidian and enable the plugin

### What's New
- Version bump to ${VERSION}
- Bug fixes and improvements" \
  main.js \
  manifest.json \
  styles.css || echo "Release creation failed, you may need to create it manually"

echo "Done! Check https://github.com/${REPO}/releases/tag/${VERSION}"
