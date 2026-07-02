FROM node:20-alpine
WORKDIR /app
COPY antrieb-100ly/ ./
COPY hail-mary/ ./hail-mary/
ENV NODE_ENV=production
EXPOSE 8770
CMD ["node", "server.js"]
