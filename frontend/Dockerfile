FROM node:24-slim AS build
RUN npm install -g pnpm@11
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-slim
USER node
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app ./
# package.jsonのstartスクリプトはローカル用ポート指定なので、直接next startを使う
CMD ["node_modules/.bin/next", "start", "--port", "3000"]
