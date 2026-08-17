FROM node:18 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build -- --configuration production

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist/Korp-Frontend-Gabriel/browser /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
