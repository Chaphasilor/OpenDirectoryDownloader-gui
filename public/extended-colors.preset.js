const defaultColors = require(`tailwindcss/defaultTheme`).colors;
const allColors = require(`tailwindcss/colors`);

const extendedColors = defaultColors;

Object.entries(allColors).forEach(([colorName, colors]) => {
  extendedColors[colorName] = colors;
  extendedColors[colorName.toLowerCase()] = colors; // tailwind classes should be all-lowercase, but the docs are using dromedarCase...
});

module.exports = {
  theme: {
    colors: extendedColors,
  }
}