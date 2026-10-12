FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm audit --audit-level=high
COPY . .
ENV VITE_API_BASE_URL=/api
RUN npm run lint && npm run build

FROM nginx:stable-alpine
COPY deploy/app.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
