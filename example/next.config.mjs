import path from "node:path";

const nextConfig = {
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
};

export default nextConfig;
