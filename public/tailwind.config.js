module.exports = {
  purge: {
    content: [
      // scans your html files for tailwind classes and deletes any unused class definitions when building for production
      // I can't think of any reason why you should change this
      './static/**/*.html',
    ],
  },
  presets: [
    // don't modify this preset if you don't know exactly what you're doing!
    require(`./extended-colors.preset.js`),
    // add your own presets below this line :)
  ],
  darkMode: `media`,
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
}
