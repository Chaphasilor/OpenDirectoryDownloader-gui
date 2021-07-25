export default ({ command, mode }) => {
  if (command === 'serve') {
    return {
      // serve specific config
      root: `.`,
      plugins: [],
      publicDir: `../`, // strange workaround to have access to the `scans` directory through the vite dev server
      server: {
        fs: {
          strict: false,
        }
      }
    }
  } else {
    return {
      // build specific config
      plugins: [],
    }
  }
}