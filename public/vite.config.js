export default {
  plugins: [],
  root: `.`,
  publicDir: `../`, // strange workaround to have access to the `scans` directory through the vite dev server
  server: {
    fs: {
      strict: false,
    }
  }
}