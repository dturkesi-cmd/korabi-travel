#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm test
npm run test:integration

echo ""
echo "start server and run npm run smoke"
