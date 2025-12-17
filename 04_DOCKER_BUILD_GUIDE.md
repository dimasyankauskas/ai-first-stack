# 🐳 PocketBase Docker Build Guide

> ⚠️ **CRITICAL UPDATE (December 2024):** This guide has been updated with the OFFICIAL build method.
> **Key Learnings:**
> 1. Build from `examples/base` (includes JavaScript hooks via jsvm plugin)
> 2. Use `CGO_ENABLED=0` (Pure Go SQLite driver doesn't need CGO)
> 3. Do NOT use `gcc` or `musl-dev` (Not needed for pure Go build)

---

## ✅ **The Correct Way to Build PocketBase**

To enable JavaScript hooks (`pb_hooks`) and standalone migrations, you must build from the `examples/base` directory in the PocketBase repository.

**Why?**
The root directory builds a minimal PocketBase without plugins. The `examples/base` directory builds a version that imports the `jsvm` plugin, which enables the JavaScript runtime.

---

## 🔧 **Universal Dockerfile Template**

Copy this into your `Dockerfile.pocketbase`:

```dockerfile
# PocketBase Dockerfile - WITH JAVASCRIPT HOOKS SUPPORT
# Based on official PocketBase build instructions from examples/base
# JavaScript hooks work via jsvm plugin, NOT via CGO!

ARG CACHE_BUST=2025-12-16

# Stage 1: Build PocketBase from source
FROM golang:1.25.5-alpine AS builder

ARG POCKETBASE_VERSION=0.34.2
ARG CACHE_BUST

# Print build info for debugging
RUN echo "=== BUILD INFO ===" && \
    echo "Architecture: $(uname -m)" && \
    echo "Cache: ${CACHE_BUST}" && \
    echo "=================="

# Install required tools (NO gcc or musl-dev needed!)
RUN apk add --no-cache git ca-certificates file

# Clone PocketBase source
RUN git clone https://github.com/pocketbase/pocketbase.git /app && \
    cd /app && \
    git checkout v${POCKETBASE_VERSION}

# Build from examples/base which includes jsvm (JavaScript) support
# This is exactly how the official releases are built!
WORKDIR /app/examples/base

# Build with CGO_ENABLED=0 - this is the OFFICIAL way per PocketBase docs
# The pure Go SQLite driver (modernc.org/sqlite) doesn't need CGO
# JavaScript hooks work via the jsvm plugin, not CGO
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

# Install runtime dependencies
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

---

## 🚨 **Troubleshooting "exec format error"**

If you see `exec /pb/pocketbase: exec format error` in your logs:

1.  **Check Binary Format:**
    Look at the build logs for `=== BINARY INFO ===`.
    - ❌ `pocketbase: current ar archive` -> **BAD**. You are building an archive, not an executable. Check your `go build` flags.
    - ✅ `pocketbase: ELF 64-bit LSB executable` -> **GOOD**.

2.  **Check Architecture:**
    - ❌ `ELF 64-bit LSB executable, ARM aarch64` running on AMD64 server
    - ✅ `ELF 64-bit LSB executable, x86-64` running on AMD64 server

3.  **Check Build Flags:**
    - Ensure `CGO_ENABLED=0`
    - Ensure `GOOS=linux` and `GOARCH=amd64` (for standard VPS)
    - Ensure you are NOT using `-buildmode=archive`

---

## 📝 **Verification**

After deploying, verify your hooks are working by adding a simple `pb_hooks/hello.pb.js`:

```javascript
onBootstrap((e) => {
  console.log("✅ JavaScript hooks are working!");
  e.next();
})
```

Check your container logs for the success message.
