import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 上位ディレクトリに紛れたpnpm-workspace.yaml等に影響されないようルートを固定
  turbopack: { root: __dirname },
};

export default nextConfig;
