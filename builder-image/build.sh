#!/bin/bash
set -euo pipefail

# ──────────────────────────────────────────────────
# Voltage Builder — Entrypoint Script
# Clones a Git repo, detects framework, builds,
# and uploads output to S3-compatible storage.
#
# Required env vars:
#   GIT_URL, DEPLOYMENT_ID, S3_ENDPOINT, S3_BUCKET,
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#
# Optional env vars:
#   COMMIT_SHA, BRANCH, BUILD_COMMAND, OUTPUT_DIR,
#   INSTALL_COMMAND, S3_REGION
# ──────────────────────────────────────────────────

PROJECT_DIR="/home/builder/project"
MANIFEST_FILE="/home/builder/manifest.json"

# ── Logging helpers ──
log_info()  { echo "[BUILD][$1] $2"; }
log_error() { echo "[ERROR][$1] $2"; }
log_stage() { echo "[STAGE][$1] $2"; }

# ── Cleanup on exit ──
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_error "exit" "Builder exited with code $exit_code"
  fi
  exit $exit_code
}
trap cleanup EXIT

# ── Validate required env vars ──
validate_env() {
  local missing=0
  for var in GIT_URL DEPLOYMENT_ID S3_ENDPOINT S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
    if [ -z "${!var:-}" ]; then
      log_error "init" "Missing required environment variable: $var"
      missing=1
    fi
  done
  if [ $missing -ne 0 ]; then
    exit 1
  fi
}

# ── Stage 1: Clone ──
stage_clone() {
  log_stage "clone" "started"
  log_info "clone" "Cloning ${GIT_URL}..."

  local clone_args="--depth 1"

  if [ -n "${BRANCH:-}" ]; then
    clone_args="$clone_args --branch $BRANCH"
    log_info "clone" "Using branch: $BRANCH"
  fi

  git clone $clone_args "$GIT_URL" "$PROJECT_DIR" 2>&1 | while IFS= read -r line; do
    log_info "clone" "$line"
  done

  cd "$PROJECT_DIR"

  # If a specific commit SHA is provided, fetch and checkout
  if [ -n "${COMMIT_SHA:-}" ]; then
    log_info "clone" "Checking out commit: $COMMIT_SHA"
    git fetch --depth 1 origin "$COMMIT_SHA" 2>&1 | while IFS= read -r line; do
      log_info "clone" "$line"
    done
    git checkout "$COMMIT_SHA" 2>&1 | while IFS= read -r line; do
      log_info "clone" "$line"
    done
  fi

  local actual_sha
  actual_sha=$(git rev-parse HEAD)
  log_info "clone" "HEAD is at $actual_sha"
  log_stage "clone" "completed"
}

# ── Framework detection ──
detect_framework() {
  cd "$PROJECT_DIR"
  DETECTED_FRAMEWORK="generic"
  DETECTED_OUTPUT_DIR=""
  DETECTED_BUILD_CMD=""
  DETECTED_IS_SPA="false"

  # Check for Next.js
  if [ -f "next.config.js" ] || [ -f "next.config.mjs" ] || [ -f "next.config.ts" ]; then
    DETECTED_FRAMEWORK="nextjs"
    # Check if it's a static export
    if grep -q "output.*export" next.config.* 2>/dev/null; then
      DETECTED_OUTPUT_DIR="out"
      DETECTED_BUILD_CMD="npm run build"
      log_info "detect" "Detected Next.js with static export (output: out/)"
    else
      DETECTED_OUTPUT_DIR="out"
      DETECTED_BUILD_CMD="npx next build"
      log_info "detect" "Detected Next.js (will attempt static export)"
      # Force static export for the builder
      if [ -f "next.config.js" ]; then
        echo "module.exports = { ...require('./next.config.js'), output: 'export' };" > next.config.export.js
        mv next.config.export.js next.config.js
      fi
    fi
    DETECTED_IS_SPA="true"
    return
  fi

  # Check for Vite
  if [ -f "vite.config.js" ] || [ -f "vite.config.ts" ] || [ -f "vite.config.mjs" ]; then
    DETECTED_FRAMEWORK="vite"
    DETECTED_OUTPUT_DIR="dist"
    DETECTED_BUILD_CMD="npm run build"
    DETECTED_IS_SPA="true"
    log_info "detect" "Detected Vite project (output: dist/)"
    return
  fi

  # Check for package.json with build script
  if [ -f "package.json" ]; then
    if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" 2>/dev/null; then
      DETECTED_FRAMEWORK="generic"
      # Try to guess output dir
      for dir in dist build public out; do
        if node -e "const p=require('./package.json'); const s=p.scripts||{}; process.exit(JSON.stringify(s).includes('$dir') ? 0 : 1)" 2>/dev/null; then
          DETECTED_OUTPUT_DIR="$dir"
          break
        fi
      done
      DETECTED_OUTPUT_DIR="${DETECTED_OUTPUT_DIR:-dist}"
      DETECTED_BUILD_CMD="npm run build"
      log_info "detect" "Detected generic Node.js project with build script (output: ${DETECTED_OUTPUT_DIR}/)"
      return
    fi
  fi

  # Static site — no build step needed
  if [ -f "index.html" ]; then
    DETECTED_FRAMEWORK="static"
    DETECTED_OUTPUT_DIR="."
    DETECTED_BUILD_CMD=""
    log_info "detect" "Detected static site (index.html at root)"
    return
  fi

  # Check public/ directory
  if [ -f "public/index.html" ]; then
    DETECTED_FRAMEWORK="static"
    DETECTED_OUTPUT_DIR="public"
    DETECTED_BUILD_CMD=""
    log_info "detect" "Detected static site (public/index.html)"
    return
  fi

  log_error "detect" "Could not detect framework or find index.html"
  exit 1
}

# ── Stage 2: Install dependencies ──
stage_install() {
  log_stage "install" "started"
  cd "$PROJECT_DIR"

  # Skip install for static sites without package.json
  if [ ! -f "package.json" ]; then
    log_info "install" "No package.json found, skipping install"
    log_stage "install" "completed"
    return
  fi

  local install_cmd="${INSTALL_COMMAND:-}"

  if [ -z "$install_cmd" ]; then
    # Auto-detect package manager
    if [ -f "pnpm-lock.yaml" ]; then
      npm install -g pnpm 2>&1 | tail -1 | while IFS= read -r line; do log_info "install" "$line"; done
      install_cmd="pnpm install --frozen-lockfile"
    elif [ -f "yarn.lock" ]; then
      install_cmd="yarn install --frozen-lockfile"
    elif [ -f "package-lock.json" ]; then
      install_cmd="npm ci"
    else
      install_cmd="npm install"
    fi
  fi

  log_info "install" "Running: $install_cmd"
  eval "$install_cmd" 2>&1 | while IFS= read -r line; do
    log_info "install" "$line"
  done

  log_stage "install" "completed"
}

# ── Stage 3: Build ──
stage_build() {
  log_stage "build" "started"
  cd "$PROJECT_DIR"

  local build_cmd="${BUILD_COMMAND:-$DETECTED_BUILD_CMD}"

  if [ -z "$build_cmd" ]; then
    log_info "build" "No build command needed (static site)"
    log_stage "build" "completed"
    return
  fi

  log_info "build" "Running: $build_cmd"
  eval "$build_cmd" 2>&1 | while IFS= read -r line; do
    log_info "build" "$line"
  done

  # Verify output directory exists
  local output_dir="${OUTPUT_DIR:-$DETECTED_OUTPUT_DIR}"
  if [ ! -d "$PROJECT_DIR/$output_dir" ]; then
    log_error "build" "Output directory '$output_dir' does not exist after build"
    # Try common alternatives
    for alt in dist build out public .next/static; do
      if [ -d "$PROJECT_DIR/$alt" ]; then
        log_info "build" "Found alternative output at '$alt'"
        DETECTED_OUTPUT_DIR="$alt"
        log_stage "build" "completed"
        return
      fi
    done
    exit 1
  fi

  log_stage "build" "completed"
}

# ── Stage 4: Upload ──
stage_upload() {
  log_stage "upload" "started"
  cd "$PROJECT_DIR"

  local output_dir="${OUTPUT_DIR:-$DETECTED_OUTPUT_DIR}"
  local upload_path="$PROJECT_DIR/$output_dir"

  # Handle "." output dir (static sites at root)
  if [ "$output_dir" = "." ]; then
    upload_path="$PROJECT_DIR"
  fi

  log_info "upload" "Uploading from: $output_dir"

  # Generate manifest
  log_info "upload" "Generating manifest..."
  local files_json="["
  local first=true
  local file_count=0

  while IFS= read -r -d '' file; do
    local rel_path="${file#$upload_path/}"
    # Skip hidden files, node_modules, .git
    case "$rel_path" in
      .git*|node_modules*|.env*) continue ;;
    esac

    local file_size
    file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
    local file_hash
    file_hash=$(md5sum "$file" 2>/dev/null | cut -d' ' -f1 || md5 -q "$file" 2>/dev/null || echo "unknown")

    if [ "$first" = true ]; then
      first=false
    else
      files_json="$files_json,"
    fi
    files_json="$files_json{\"path\":\"$rel_path\",\"size\":$file_size,\"hash\":\"$file_hash\"}"
    file_count=$((file_count + 1))
  done < <(find "$upload_path" -type f -print0 2>/dev/null)

  files_json="$files_json]"

  # Detect SPA
  local is_spa="$DETECTED_IS_SPA"
  if [ -f "$upload_path/index.html" ] && [ "$is_spa" = "false" ]; then
    # If there's an index.html and JS files, likely a SPA
    if find "$upload_path" -name "*.js" -type f | head -1 | grep -q .; then
      is_spa="true"
    fi
  fi

  # Write manifest
  cat > "$MANIFEST_FILE" <<EOF
{
  "deploymentId": "$DEPLOYMENT_ID",
  "projectId": "${PROJECT_ID:-unknown}",
  "files": $files_json,
  "framework": "$DETECTED_FRAMEWORK",
  "outputDir": "$output_dir",
  "isSPA": $is_spa,
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

  log_info "upload" "Manifest: $file_count files, framework=$DETECTED_FRAMEWORK, isSPA=$is_spa"

  # Configure AWS CLI for S3-compatible storage
  export AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}"

  # Upload files
  log_info "upload" "Uploading $file_count files to s3://${S3_BUCKET}/deployments/${DEPLOYMENT_ID}/..."
  aws s3 sync "$upload_path" "s3://${S3_BUCKET}/deployments/${DEPLOYMENT_ID}/" \
    --endpoint-url "$S3_ENDPOINT" \
    --exclude ".git/*" \
    --exclude "node_modules/*" \
    --exclude ".env*" \
    --no-progress \
    2>&1 | while IFS= read -r line; do
      log_info "upload" "$line"
    done

  # Upload manifest
  aws s3 cp "$MANIFEST_FILE" "s3://${S3_BUCKET}/deployments/${DEPLOYMENT_ID}/manifest.json" \
    --endpoint-url "$S3_ENDPOINT" \
    2>&1 | while IFS= read -r line; do
      log_info "upload" "$line"
    done

  log_info "upload" "Upload complete: s3://${S3_BUCKET}/deployments/${DEPLOYMENT_ID}/"
  log_stage "upload" "completed"
}

# ── Main ──
main() {
  log_info "init" "Voltage Builder starting"
  log_info "init" "Deployment ID: ${DEPLOYMENT_ID:-unknown}"
  log_info "init" "Git URL: ${GIT_URL:-unknown}"

  validate_env
  stage_clone
  detect_framework
  stage_install
  stage_build
  stage_upload

  log_info "done" "Build completed successfully"
}

main "$@"
