FROM node:20-alpine

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "src/server.js"]
