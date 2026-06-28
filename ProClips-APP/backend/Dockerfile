FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev=false
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# 同步把 schema.sql / seed.sql 拷贝到 dist 目录，保证编译后运行时仍能找到
RUN cp src/db/*.sql dist/db/ 2>/dev/null || true

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# 防御性从 src 复制一遍（万一 builder 阶段 cp 失败）
RUN mkdir -p /app/dist/db && cp /app/src/db/*.sql /app/dist/db/ 2>/dev/null || true
RUN mkdir -p /data/uploads /data/results /data/logs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]
