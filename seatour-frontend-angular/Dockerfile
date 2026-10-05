FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration docker

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-api.conf /etc/nginx/seatour-api.conf
COPY --from=build /workspace/dist/seatour-frontend-angular/browser/ /usr/share/nginx/html/
EXPOSE 80
