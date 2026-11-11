/** @type {import('next').NextConfig} */
const config = {
  // Keep production verification from overwriting a running dev server's cache.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default config;
