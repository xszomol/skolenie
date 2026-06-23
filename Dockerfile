# ---- Stage 1: Build ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: Runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# LibreOffice needs a writable home directory; /tmp is always writable.
ENV HOME=/tmp

# System deps for lesson file conversion:
#   libreoffice   — converts PPT/PPTX → PDF (headless)
#   poppler-utils — pdftoppm converts PDF pages → PNG images
#   python3-pip   — needed to install python-pptx for slide title extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    python3-pip \
 && pip3 install --no-cache-dir --break-system-packages python-pptx \
 && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json   ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma         ./prisma

COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./entrypoint.sh"]
