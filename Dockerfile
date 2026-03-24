FROM node:18-alpine

WORKDIR /app

COPY api/package*.json ./

RUN npm install --omit=dev

COPY api/ .

EXPOSE 3001

CMD ["node", "server.js"]
