export default {
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: false,
    // Local authoring sources are not web assets, even inside this checkout.
    fs: {
      deny: [
        ".env", ".env.*", "*.{crt,pem}", "**/.git/**",
        "**/.local/**", "**/.cache/**", "**/assets/source/**",
        "**/docs/private/**", "**/*.photoslibrary/**",
      ],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
};
