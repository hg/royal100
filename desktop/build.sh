#!/bin/bash

set -euo pipefail

root=$(realpath "$(dirname "$0")")

for target in \
  linux/386 \
  linux/amd64 \
  linux/arm \
  linux/arm64 \
  darwin/amd64 \
  darwin/arm64 \
  windows/386 \
  windows/amd64 \
  windows/arm; do

  export GOOS=${target%/*}
  export GOARCH=${target##*/}

  echo >&2 "building for $target ..."

  out="$root/apps/$GOOS/$GOARCH"
  mkdir -p "$out"
  cd "$out"

  go build "$root"
done

echo >&2 "done"
