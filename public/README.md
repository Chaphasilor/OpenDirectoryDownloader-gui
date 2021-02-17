# Tailwind Template

## Quick Start

1. Install all dependencies:

    ```shell
    npm i
    ```

2. Build the project **for development** and have it open in your default browser:

    ```shell
    npm run watch
    ```

   **Tip**: [Browsersync](https://browsersync.io/) is used to serve the project. It will automatically sync reloads, scroll events, form inputs and more between different tabs/browsers/clients. So you can open the URL displayed in the terminal on your phone to test both desktop and mobile layout at the same time!

3. Build the project **for production**:

   ```shell
   npm run build
   ```

   *On Windows you might get a warning about the command `export` not being recognized. You can safely ignore it.*

   This will minify your bundle and apply some additional optimizations through webpack. After building for production, you can simply copy the `static`-folder and upload it to your web server, etc.

## Features

<!-- TODO -->
TODO

## Working With The Template

### File Management

- Place any static files (e.g. html, images) into the `static/` folder
- Place any files you want to run through webpack into the `src/` folder **and import the files in `index.js`** (or inside another js file that is already imported in `index.js`).  
  Check out how it's done with `example-dependency.js` :)
- If you add aditional html pages, remember to include the webpack bundles in each one!  
  Just include `<script src="webpack/tailwind.bundle.js"></script>` inside the head and `<script src="webpack/index.bundle.js"></script>` at the bottom of the html file.
- Don't put anything inside `static/webpack/` as the folder is cleared on every build
- If you change the output filename(s) inside the webpack config, you'll have to manually change them in each webpack bundle import (see above)

### Tailwind

[TailwindCSS](https://tailwindcss.com/) is included out-of-the-box. A default config with minor additions is used. For more info, keep reading.

#### Colors

- All colors from the [default palette](https://tailwindcss.com/docs/customizing-colors) are available
- All additional colors from the [color palette reference](https://tailwindcss.com/docs/customizing-colors#color-palette-reference) are **also** available. They can be accessed both in *lowercase* or *dromedarCase* for convenience (docs use dromedarCase, but I like my class names lowercase...).  
  *Keep in mind that some colors from the the color palette reference are aliased in the default palette ([take a look at this](https://github.com/tailwindlabs/tailwindcss/blob/3de0c48bd67f47c94f484bf7d92dc41e707e9abc/stubs/defaultConfig.stub.js#L15-L28)). So `amber` is actually the exact same as `yellow`. This shouldn't be an issue for you, just don't get a headache trying to figure out why a color isn't working ^^.*

#### Customizing

You can simply load any of your own Tailwind configurations by requiring the file inside the `presets`-array in `tailwind.config.js`. Just make sure to add your config *after* the default presets so you don't break any features.

### Troubleshooting

#### Browsersync errors

On Windows, you need Visual C++ runtime libraries for the installation to work. More info [here](https://www.browsersync.io/docs#windows-users). Once that is fixed, try running `npm i` again.