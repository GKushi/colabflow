FROM node:jod-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run db:generate

RUN npm run build

FROM node:jod-alpine AS prod

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3000
RUN apk add --no-cache openssl3 libstdc++ ca-certificates
RUN ln -s /lib/libssl.so.3 /lib/libssl.so
RUN ln -s /lib/libcrypto.so.3 /lib/libcrypto.so

COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
