#!/bin/bash

set -e

echo "Starting git push and release process..."

echo "Pushing commits to origin/main..."
git push origin main

echo "Pushing tag 1.0.2..."
git push origin 1.0.2

echo "Creating GitHub release 1.0.2..."
gh release create 1.0.2 \
  --title "LLMSider v1.0.2" \
  --notes "Release version 1.0.2

## Obsidian Plugin Files
This release includes the required files for Obsidian plugin installation:
- \`main.js\` - Plugin code
- \`manifest.json\` - Plugin manifest
- \`styles.css\` - Plugin styles

## Installation
Download the files and place them in your vault's \`.obsidian/plugins/llmsider/\` directory." \
  main.js \
  manifest.json \
  styles.css

echo "Release created successfully!"
