FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    python3 \
    py3-pip \
    aws-cli \
    && rm -rf /var/cache/apk/*

# Create non-root builder user
RUN addgroup -S builder && adduser -S -G builder -h /home/builder builder

# Create workspace directory owned by builder
RUN mkdir -p /home/builder/project /home/builder/output \
    && chown -R builder:builder /home/builder

# Copy entrypoint script
COPY --chown=builder:builder build.sh /home/builder/build.sh
RUN chmod +x /home/builder/build.sh

# Drop to non-root user
USER builder
WORKDIR /home/builder

ENTRYPOINT ["/bin/bash", "/home/builder/build.sh"]
