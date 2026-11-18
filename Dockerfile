FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Runtime deps: fail on high. Build-only tooling processes only our sources, so
# it fails on critical; high there is tracked manually (picomatch ReDoS has no fix).
RUN npm ci --ignore-scripts \
  && npm audit --omit=dev --audit-level=high \
  && npm audit --audit-level=critical
COPY . .
ENV VITE_API_BASE_URL=/api
ENV VITE_TELEGRAM_BOT_URL=https://t.me/rate_review_hub_bot
RUN npm run lint && npm test && npm run build && npm run test:ssr

# Fixed mtimes make the dependency layer byte-identical between builds, so the
# server reuses the already unpacked layer and loads only the app layer.
# Only node_modules: dist mtimes back ETag/Last-Modified of static files.
FROM build AS runtime-deps
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
  && rm -rf node_modules/.package-lock.json node_modules/.vite node_modules/.cache \
  && mkdir /deps && mv node_modules /deps/ \
  && find /deps -exec touch -h -d @0 {} +

FROM node:22-alpine
LABEL org.opencontainers.image.source=https://github.com/DryundeL/review-app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=runtime-deps /deps /app
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]
