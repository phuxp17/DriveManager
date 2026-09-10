#!/usr/bin/env bash
set -euo pipefail

: "${GHCR_NAMESPACE:?GHCR_NAMESPACE is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

cd /opt/drivemanager
previous="$(cat .deployed-tag 2>/dev/null || true)"

docker compose -f compose.prod.yml pull backend frontend

if docker compose -f compose.prod.yml up -d --remove-orphans --wait --wait-timeout 120; then
    printf '%s\n' "$IMAGE_TAG" > .deployed-tag
    echo "Deployed $IMAGE_TAG"
    exit 0
fi

if [[ -n "$previous" ]]; then
    echo "Deployment failed; rolling back to $previous" >&2
    IMAGE_TAG="$previous" docker compose -f compose.prod.yml up -d --remove-orphans --wait --wait-timeout 120
fi

exit 1
