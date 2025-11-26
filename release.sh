#!/bin/bash

# Obsidian Plugin Release Script
# Usage: ./release.sh [build|release|submit]

set -e

# Configuration
VERSION="0.5.0"
PLUGIN_ID="llmsider"
REMOTE_REPO="git@github.com:gnuhpc/obsidian-llmsider.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update version in files
update_version() {
    log_info "Updating version to ${VERSION}..."
    
    # Update manifest.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" manifest.json
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" manifest.json
    fi
    
    # Update package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
    else
        sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
    fi
    
    log_info "Version updated successfully"
}

# Build the plugin
build_plugin() {
    log_info "Building plugin..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_warn "node_modules not found, running npm install..."
        npm install
    fi
    
    # Run linting
    log_info "Running ESLint..."
    npm run lint
    
    # Build production version
    log_info "Building production bundle..."
    npm run build
    
    # Check if main.js was created
    if [ ! -f "main.js" ]; then
        log_error "Build failed: main.js not found"
        exit 1
    fi
    
    log_info "Build completed successfully"
}

# Create plugin release package (for Obsidian)
create_plugin_package() {
    log_info "Creating plugin release package..."
    
    local package_dir="dist"
    local package_file="${PLUGIN_ID}-${VERSION}.zip"
    
    # Remove old package if exists
    if [ -f "${package_file}" ]; then
        log_info "Removing old package: ${package_file}"
        rm -f "${package_file}"
    fi
    
    # Clean and create dist directory
    rm -rf "$package_dir"
    mkdir -p "$package_dir"
    
    # Copy necessary files only
    cp main.js "$package_dir/"
    cp manifest.json "$package_dir/"
    cp styles.css "$package_dir/"
    
    # Create zip file (only include the 3 required files)
    cd "$package_dir"
    zip -q "../${package_file}" main.js manifest.json styles.css
    cd ..
    
    log_info "Plugin package created: ${package_file}"
    echo "${package_file}"
}

# Create full project package (for deployment)
create_project_package() {
    log_info "Creating full project package..."
    
    local project_package="../${PLUGIN_ID}-project-${VERSION}.tar.gz"
    local project_dir=$(basename "$(pwd)")
    
    # Remove old package if exists
    if [ -f "${project_package}" ]; then
        log_info "Removing old project package: ${project_package}"
        rm -f "${project_package}"
    fi
    
    # Create tar.gz in parent directory with proper directory structure
    log_info "Packaging project files..."
    cd ..
    tar -czf "${PLUGIN_ID}-project-${VERSION}.tar.gz" \
        --exclude="${project_dir}/node_modules" \
        --exclude="${project_dir}/.git" \
        --exclude="${project_dir}/*.tar.gz" \
        --exclude="${project_dir}/*.zip" \
        --exclude="${project_dir}/dist" \
        --exclude="${project_dir}/.DS_Store" \
        --exclude="${project_dir}/*.log" \
        --exclude="${project_dir}/test-vault" \
        --exclude="${project_dir}/.vscode" \
        --exclude="${project_dir}/.idea" \
        "${project_dir}"
    cd "${project_dir}"
    
    log_info "Project package created: ${project_package}"
    echo "${project_package}"
}

# Release to GitHub
release_to_github() {
    log_info "Releasing to GitHub..."
    
    if ! command_exists git; then
        log_error "git command not found"
        exit 1
    fi
    
    # Check if we're in a git repository
    if [ ! -d ".git" ]; then
        log_info "Initializing git repository..."
        git init
        git remote add origin "$REMOTE_REPO"
    fi
    
    # Check if remote exists
    if ! git remote | grep -q origin; then
        log_info "Adding remote origin..."
        git remote add origin "$REMOTE_REPO"
    else
        # Update remote URL
        git remote set-url origin "$REMOTE_REPO"
    fi
    
    # Add files
    log_info "Adding files to git..."
    git add -A
    
    # Commit
    log_info "Creating commit..."
    git commit -m "Release ${VERSION}" || log_warn "No changes to commit"
    
    # Delete old tag (local and remote)
    log_info "Cleaning up old tag ${VERSION}..."
    git tag -d "${VERSION}" 2>/dev/null || log_warn "Local tag ${VERSION} not found"
    git push origin --delete "${VERSION}" 2>/dev/null || log_warn "Remote tag ${VERSION} not found"
    
    # Create tag
    log_info "Creating tag ${VERSION}..."
    git tag -a "${VERSION}" -m "Release version ${VERSION}"
    
    # Push to remote
    log_info "Pushing to GitHub..."
    git push -u origin master --force
    git push origin "${VERSION}" --force
    
    log_info "GitHub release completed"
    log_info "Repository: ${REMOTE_REPO}"
    log_info "Tag: ${VERSION}"
}

# Create GitHub release with assets
create_github_release() {
    log_info "Creating GitHub release with assets..."
    
    if ! command_exists gh; then
        log_warn "GitHub CLI (gh) not found. Please install it or create release manually."
        log_info "Manual steps:"
        log_info "1. Go to https://github.com/gnuhpc/obsidian-llmsider/releases/new"
        log_info "2. Choose tag: ${VERSION}"
        log_info "3. Upload files: main.js, manifest.json, styles.css"
        log_info "4. GitHub will automatically include source code archives"
        return
    fi
    
    # Check required files exist
    if [[ ! -f "main.js" ]] || [[ ! -f "manifest.json" ]] || [[ ! -f "styles.css" ]]; then
        log_error "Required plugin files not found. Please run build first."
        return 1
    fi
    
    # Delete old release if exists
    log_info "Cleaning up old release ${VERSION}..."
    gh release delete "${VERSION}" --repo gnuhpc/obsidian-llmsider --yes 2>/dev/null || log_warn "Release ${VERSION} not found"
    
    # Create release (GitHub automatically includes source code)
    log_info "Creating release on GitHub..."
    gh release create "${VERSION}" \
        --repo gnuhpc/obsidian-llmsider \
        --title "Release ${VERSION}" \
        --notes "Release version ${VERSION}" \
        main.js manifest.json styles.css
    
    log_info "GitHub release created successfully"
    log_info "Assets uploaded: main.js, manifest.json, styles.css"
    log_info "Source code archives will be automatically generated by GitHub"
}

# Submit for Obsidian review
submit_for_review() {
    log_info "Starting automated Obsidian plugin submission process..."
    
    # Check if gh CLI is installed
    if ! command_exists gh; then
        log_error "GitHub CLI (gh) is required for automated submission"
        log_info "Install it with: brew install gh"
        log_info "Then authenticate with: gh auth login"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &>/dev/null; then
        log_error "Not authenticated with GitHub CLI"
        log_info "Please run: gh auth login"
        exit 1
    fi
    
    # Verify plugin release exists
    log_info "Verifying plugin release ${VERSION} exists..."
    if ! gh release view "${VERSION}" --repo gnuhpc/obsidian-llmsider &>/dev/null; then
        log_error "Release ${VERSION} not found on GitHub"
        log_info "Please run './release.sh release' first"
        exit 1
    fi
    
    # Create temp directory for obsidian-releases fork
    local temp_dir=$(mktemp -d)
    cd "$temp_dir" || exit 1
    
    log_info "Forking obsidian-releases repository..."
    gh repo fork obsidianmd/obsidian-releases --clone=true --remote=true 2>/dev/null || {
        log_warn "Fork might already exist, cloning existing fork..."
        gh repo clone obsidianmd/obsidian-releases 2>/dev/null || {
            log_info "Cloning from existing fork..."
            local gh_user=$(gh api user --jq '.login')
            git clone "https://github.com/${gh_user}/obsidian-releases.git"
        }
    }
    
    cd obsidian-releases || exit 1
    
    # Sync fork with upstream
    log_info "Syncing fork with upstream..."
    git remote add upstream https://github.com/obsidianmd/obsidian-releases.git 2>/dev/null || true
    git fetch upstream
    git checkout master 2>/dev/null || git checkout main
    git merge upstream/master --ff-only 2>/dev/null || git merge upstream/main --ff-only
    
    # Create new branch for submission
    local branch_name="add-${PLUGIN_ID}-plugin"
    log_info "Creating branch ${branch_name}..."
    git checkout -b "${branch_name}" 2>/dev/null || git checkout "${branch_name}"
    
    # Read manifest.json to get plugin info
    local manifest_json=$(cat << EOF
{
  "id": "${PLUGIN_ID}",
  "name": "LLMSider",
  "author": "gnuhpc",
  "description": "Lightweight AI Chat - Simple multi-LLM chat interface with support for OpenAI, Anthropic, and more.",
  "repo": "gnuhpc/obsidian-llmsider"
}
EOF
)
    
    # Check if plugin already exists in community-plugins.json
    if grep -q "\"id\": \"${PLUGIN_ID}\"" community-plugins.json 2>/dev/null; then
        log_warn "Plugin already exists in community-plugins.json"
        log_info "Checking if update is needed..."
        
        # Extract current repo info
        local current_repo=$(jq -r ".[] | select(.id == \"${PLUGIN_ID}\") | .repo" community-plugins.json)
        if [ "$current_repo" != "gnuhpc/obsidian-llmsider" ]; then
            log_info "Updating plugin repository information..."
            # Update the existing entry
            jq "map(if .id == \"${PLUGIN_ID}\" then {
              \"id\": \"${PLUGIN_ID}\",
              \"name\": \"LLMSider\",
              \"author\": \"gnuhpc\",
              \"description\": \"Lightweight AI Chat - Simple multi-LLM chat interface with support for OpenAI, Anthropic, and more.\",
              \"repo\": \"gnuhpc/obsidian-llmsider\"
            } else . end)" community-plugins.json > community-plugins.json.tmp
            mv community-plugins.json.tmp community-plugins.json
        else
            log_info "Plugin information is already up to date"
            cd - >/dev/null
            rm -rf "$temp_dir"
            log_info "No submission needed - plugin already registered"
            return 0
        fi
    else
        log_info "Adding plugin to community-plugins.json..."
        # Add new plugin entry (append to array)
        jq ". += [{
          \"id\": \"${PLUGIN_ID}\",
          \"name\": \"LLMSider\",
          \"author\": \"gnuhpc\",
          \"description\": \"Lightweight AI Chat - Simple multi-LLM chat interface with support for OpenAI, Anthropic, and more.\",
          \"repo\": \"gnuhpc/obsidian-llmsider\"
        }]" community-plugins.json > community-plugins.json.tmp
        mv community-plugins.json.tmp community-plugins.json
    fi
    
    # Commit changes
    log_info "Committing changes..."
    git add community-plugins.json
    git commit -m "Add ${PLUGIN_ID} plugin" || {
        log_warn "No changes to commit, might already be submitted"
        cd - >/dev/null
        rm -rf "$temp_dir"
        return 0
    }
    
    # Push to fork
    log_info "Pushing to fork..."
    local gh_user=$(gh api user --jq '.login')
    git push -u origin "${branch_name}" --force
    
    # Create pull request
    log_info "Creating pull request..."
    
    # Create temp file for PR body
    local pr_body_file=$(mktemp)
    cat > "$pr_body_file" << 'PRBODY'
# I am submitting a new Community Plugin

- [x] I attest that I have done my best to deliver a high-quality plugin, am proud of the code I have written, and would recommend it to others. I commit to maintaining the plugin and being responsive to bug reports. If I am no longer able to maintain it, I will make reasonable efforts to find a successor maintainer or withdraw the plugin from the directory.

## Repo URL

Link to my plugin: https://github.com/gnuhpc/obsidian-llmsider

## Release Checklist
- [x] I have tested the plugin on
  - [x] Windows
  - [x] macOS
  - [x] Linux
  - [ ] Android _(if applicable)_
  - [ ] iOS _(if applicable)_
- [x] My GitHub release contains all required files (as individual files, not just in the source.zip / source.tar.gz)
  - [x] `main.js`
  - [x] `manifest.json`
  - [x] `styles.css` _(optional)_
- [x] GitHub release name matches the exact version number specified in my manifest.json (_**Note:** Use the exact version number, do not include a prefix `v`_)
- [x] The `id` in my `manifest.json` matches the `id` in the `community-plugins.json` file.
- [x] My README.md describes the plugin's purpose and provides clear usage instructions.
- [x] I have read the developer policies at https://docs.obsidian.md/Developer+policies, and have assessed my plugin's adherence to these policies.
- [x] I have read the tips in https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines and have self-reviewed my plugin to avoid these common pitfalls.
- [x] I have added a license in the LICENSE file.
- [x] My project respects and is compatible with the original license of any code from other plugins that I'm using.
      I have given proper attribution to these other projects in my `README.md`.
PRBODY
    
    local pr_url=$(gh pr create \
        --repo obsidianmd/obsidian-releases \
        --title "Add ${PLUGIN_ID} plugin" \
        --body-file "$pr_body_file" 2>&1) || {
        rm -f "$pr_body_file"
        log_error "Failed to create pull request"
        log_info "This might be because a PR already exists"
        log_info "Check: https://github.com/obsidianmd/obsidian-releases/pulls"
        cd - >/dev/null
        rm -rf "$temp_dir"
        return 1
    }
    
    # Cleanup
    rm -f "$pr_body_file"
    cd - >/dev/null
    rm -rf "$temp_dir"
    
    log_info "${GREEN}Pull request created successfully!${NC}"
    log_info ""
    log_info "PR URL: ${pr_url}"
    log_info ""
    log_info "Next steps:"
    log_info "1. Wait for Obsidian team review"
    log_info "2. Address any feedback if requested"
    log_info "3. Once approved, your plugin will be available in Obsidian community plugins"
    log_info ""
    log_info "You can track the PR at:"
    log_info "https://github.com/obsidianmd/obsidian-releases/pulls"
}

# Main script
main() {
    local command="${1:-help}"
    
    case "$command" in
        build)
            log_info "Starting build process..."
            update_version
            build_plugin
            create_project_package
            log_info "Build process completed!"
            log_info ""
            log_info "Generated file:"
            log_info "  - ${PLUGIN_ID}-project-${VERSION}.tar.gz (full project for deployment)"
            ;;
        release)
            log_info "Starting release process..."
            release_to_github
            create_github_release
            log_info "Release process completed!"
            ;;
        submit)
            log_info "Displaying submission instructions..."
            submit_for_review
            ;;
        all)
            log_info "Running full release pipeline..."
            update_version
            build_plugin
            create_project_package
            release_to_github
            create_github_release
            submit_for_review
            log_info "Full release pipeline completed!"
            ;;
        help|*)
            cat << EOF
${GREEN}Obsidian Plugin Release Script${NC}

Usage: ./release.sh [command]

Commands:
  ${YELLOW}build${NC}    - Build plugin and create project package
            • Update version to ${VERSION}
            • Run linting
            • Build production bundle
            • Create project tar.gz package (for deployment)

  ${YELLOW}release${NC}  - Release to GitHub
            • Commit and push to ${REMOTE_REPO}
            • Create tag ${VERSION}
            • Create GitHub release with assets:
              - main.js, manifest.json, styles.css
              - Source code (automatically by GitHub)

  ${YELLOW}submit${NC}   - Show submission instructions
            • Display checklist for Obsidian review

  ${YELLOW}all${NC}      - Run all steps (build + release + submit)

  ${YELLOW}help${NC}     - Show this help message

${YELLOW}Examples:${NC}
  ./release.sh build
  ./release.sh release
  ./release.sh all

EOF
            ;;
    esac
}

# Run main function
main "$@"
