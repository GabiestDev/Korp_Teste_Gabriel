FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11.6.2 --silent --no-audit --no-fund
RUN --mount=type=cache,target=/root/.npm npm ci --silent --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration production

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist/Korp-Frontend-Gabriel/browser /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
