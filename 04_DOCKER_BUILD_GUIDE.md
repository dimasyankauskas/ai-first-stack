Here is the finalized, copy‑paste version of **04_DOCKER_BUILD_GUIDE.md** with all revisions applied.[1]

```md
# 🐳 PocketBase Docker Build Guide

> ⚠️ **CRITICAL UPDATE (December 2024):** This guide uses the official PocketBase build method for **v0.34.2+** with JavaScript hooks.
>
> Key points:
> 1. Build from `examples/base` (includes the `jsvm` plugin for JavaScript hooks).
> 2. Use `CGO_ENABLED=0` (pure Go SQLite driver; no CGO required).
> 3. Do **not** install `gcc` or `musl-dev` (not needed for this build).

This Dockerfile must stay in sync with:

- `01_QUICK_START.md` (project skeleton and Compose files). [file:45]  
- `AI_SYSTEM_INSTRUCTIONS.md` (Alpine, `/bin/sh`, PocketBase v0.34.2 hooks). [file:43]

---

## ✅ The correct way to build PocketBase

To enable JavaScript hooks (`pb_hooks`) and standalone migrations, you **must** build from the `examples/base` directory in the PocketBase repository.

- Root of the repo builds a minimal PocketBase **without plugins**.  
- `examples/base` builds PocketBase **with the `jsvm` plugin**, which enables the JavaScript runtime used by your `.pb.js` hook files. [file:48]

---

## 🔧 Universal `Dockerfile.pocketbase` template

Copy this into your `Dockerfile.pocketbase`:

```
# PocketBase Dockerfile - WITH JavaScript hooks support
# Based on official PocketBase build instructions from examples/base.
# JavaScript hooks work via the jsvm plugin, NOT via CGO.

ARG CACHE_BUST=2025-12-16

# Stage 1: Build PocketBase from source
FROM golang:1.22-alpine AS builder

ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

# Print build info for debugging
RUN echo "=== BUILD INFO ===" && \
    echo "Architecture: $(uname -m)" && \
    echo "Cache: ${CACHE_BUST}" && \
    echo "=================="

# Install required tools (no gcc or musl-dev needed)
RUN apk add --no-cache git ca-certificates file

# Clone PocketBase source
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && \
    git checkout v${POCKETBASE_VERSION}

# Build from examples/base which includes jsvm (JavaScript) support
# This matches the official release build.
WORKDIR /app/examples/base

# Build with CGO_ENABLED=0 - pure Go SQLite driver
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

RUN go build -v -o /pocketbase . && \
    echo "=== BINARY INFO ===" && \
    ls -la /pocketbase && \
    file /pocketbase && \
    echo "=================="

# Stage 2: Minimal runtime
FROM alpine:3.21

# Runtime dependencies
RUN apk add --no-cache ca-certificates wget

# Copy built PocketBase
COPY --from=builder /pocketbase /pb/pocketbase

# Verify binary is correct ELF executable
RUN chmod +x /pb/pocketbase && \
    echo "=== RUNTIME VERIFY ===" && \
    file /pb/pocketbase && \
    echo "======================"

# Create directories
RUN mkdir -p /pb/pb_hooks /pb/pb_data

# Copy hooks
COPY pb_hooks /pb/pb_hooks

WORKDIR /pb
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8090/api/health || exit 1

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

> For ARM servers (e.g., some cloud providers), you can change `GOARCH=arm64`, but your VPS and image architecture must always match.

---

## 🚨 Troubleshooting `exec format error`

If your container logs show:

```
exec /pb/pocketbase: exec format error
```

follow this checklist:

1. **Check binary format (build logs)**

   Look at the `=== BINARY INFO ===` section:

   - ❌ `pocketbase: current ar archive` → you built an **archive**, not an executable; check your `go build` flags.  
   - ✅ `pocketbase: ELF 64-bit LSB executable` → correct binary type.

2. **Check architecture**

   - ❌ `ELF 64-bit LSB executable, ARM aarch64` running on an **AMD64** VPS → wrong architecture.  
   - ✅ `ELF 64-bit LSB executable, x86-64` running on an **AMD64** VPS → correct.

3. **Check build flags**

   - Ensure `CGO_ENABLED=0`.  
   - Ensure `GOOS=linux` and `GOARCH=amd64` (for your current VPS).  
   - Ensure you are **not** using `-buildmode=archive` or other non‑standard modes.

If any of those are wrong, fix them and rebuild the image.

---

## 📝 Verification: confirm hooks are working

After deploying this image (locally or on Dokploy), add a simple test hook to `pb_hooks/hello.pb.js`:

```
onBootstrap((e) => {
  console.log("✅ JavaScript hooks are working!");
  e.next();
});
```

Then:

1. Start the container (e.g., `docker compose up` or deploy via Dokploy).  
2. Check the container logs for the `✅ JavaScript hooks are working!` message.

If you see the message and the service is healthy on `/api/health`, your PocketBase build and JS hooks are correctly wired.
