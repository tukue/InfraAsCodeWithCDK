#!/usr/bin/env bash
# Local development bootstrapper for InfraAsCodeWithCDK Platform
set -euo pipefail

echo "==> InfraAsCodeWithCDK Local Development Environment"
echo ""

# Check prerequisites
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "[ERROR] $1 is not installed. Please install it first."
    return 1
  fi
}

PREREQS=(node npm docker)
for cmd in "${PREREQS[@]}"; do
  check_command "$cmd" || exit 1
done

# Verify Node version matches .nvmrc
REQUIRED_NODE=$(cat .nvmrc 2>/dev/null || echo "20")
CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)

if [ "$CURRENT_NODE" -lt "$(echo "$REQUIRED_NODE" | sed 's/[^0-9]//g')" ]; then
  echo "[WARN] Node.js version $CURRENT_NODE detected. .nvmrc specifies $REQUIRED_NODE."
  echo "       Consider using nvm: nvm use"
fi

case "${1:-help}" in
  setup)
    echo "[1/4] Installing dependencies..."
    npm ci

    echo "[2/4] Building project..."
    npm run build

    echo "[3/4] Running tests..."
    npm test

    echo "[4/4] Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  ./local-dev.sh start    # Start LocalStack and dev environment"
    echo "  ./local-dev.sh synth    # Synthesize CDK stacks"
    echo "  ./local-dev.sh test     # Run tests"
    ;;
  start)
    echo "Starting LocalStack..."
    docker compose up -d localstack
    echo "Waiting for LocalStack to be ready..."
    sleep 5
    if curl -s http://localhost:4566/_localstack/health | grep -q "running"; then
      echo "LocalStack is ready!"
    else
      echo "[WARN] LocalStack might not be fully ready yet."
    fi
    ;;
  stop)
    echo "Stopping LocalStack..."
    docker compose down
    ;;
  synth)
    echo "Synthesizing CDK stacks..."
    npm run synth
    ;;
  test)
    echo "Running tests..."
    npm test
    ;;
  test:coverage)
    echo "Running tests with coverage..."
    npm run coverage
    ;;
  lint)
    echo "Running linter..."
    npm run lint
    ;;
  build)
    echo "Building project..."
    npm run build
    ;;
  clean)
    echo "Cleaning build artifacts..."
    rm -rf dist cdk.out coverage
    echo "Done."
    ;;
  *)
    echo "Usage: ./local-dev.sh <command>"
    echo ""
    echo "Commands:"
    echo "  setup          Install deps, build, and run tests"
    echo "  start          Start LocalStack (Docker)"
    echo "  stop           Stop LocalStack"
    echo "  synth          CDK synthesize"
    echo "  test           Run tests"
    echo "  test:coverage  Run tests with coverage"
    echo "  lint           Run ESLint"
    echo "  build          TypeScript build"
    echo "  clean          Remove build artifacts"
    ;;
esac
