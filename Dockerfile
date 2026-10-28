FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm audit --audit-level=high
COPY . .
ENV VITE_API_BASE_URL=/api
ENV VITE_TELEGRAM_BOT_URL=https://t.me/rate_review_hub_bot
RUN npm run lint && npm test && npm run build && npm run test:ssr

FROM build AS runtime-deps
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json
COPY --from=runtime-deps /app/node_modules ./node_modules
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]
