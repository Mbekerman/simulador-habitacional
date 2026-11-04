FROM node:22-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 PUBLIC_HTTPS=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
