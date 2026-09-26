import type { NextConfig } from "next";

const repoName = "break_even_getraenk";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? `/${repoName}` : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
