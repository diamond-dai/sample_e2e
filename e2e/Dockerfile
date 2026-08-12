# バージョンは package.json の @playwright/test と一致させること(ブラウザ同梱)
FROM mcr.microsoft.com/playwright:v1.62.1-noble
RUN npm install -g pnpm@11
WORKDIR /work
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY playwright.config.ts tsconfig.json ./
COPY tests ./tests
CMD ["pnpm", "test"]
