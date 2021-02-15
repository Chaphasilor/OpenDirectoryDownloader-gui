require(`dotenv`).config()
const betterLogging = require(`better-logging`)
betterLogging(console, {
  messageConstructionStrategy: betterLogging.MessageConstructionStrategy.FIRST,
})
const { log, info, error, trace, warn, debug, assert } = require(`console`)
console.logLevel = process.env.environment === `development` ? 4 : 2
const OpenDirectoryDownloader = require(`open-directory-downloader`)
const Koa = require(`koa`)
const router = require(`@koa/router`)()
const cors = require(`@koa/cors`)
const bodyParser = require(`koa-bodyparser`)

const ODD = new OpenDirectoryDownloader()
const app = new Koa()

app.use(cors())
app.use(bodyParser())
app.listen(process.env.PORT)

router.get(`/`, async (ctx) => {

  // if (!ctx.request.query.state) {
  //   ctx.status = 400;
  //   ctx.body = `Missing `state` query parameter (can be `on` or `off`)`;
  //   return;
  // }

  ctx.body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OpenDirectoryDownloader</title>
    </head>
    <body>
      
      <form action="/scan" method="POST">
      
        <input type="text" name="url" id="url">
    
        <input type="submit" value="Scan!">
        
      </form>
      
    </body>
    </html>
  `
  
})

router.post(`/scan`, async (ctx) => {

  if (!ctx.request.body.url) {
    ctx.status = 400;
    ctx.body = `Missing 'url' parameter!`;
    return;
  }

  try {
    if (!(new URL(ctx.request.body.url))) {
      ctx.status = 400;
      ctx.body = `Parameter 'url' is not a valid URL!`;
      return;
    }
  } catch (err) {
    ctx.status = 400;
    ctx.body = `Parameter 'url' is not a valid URL!`;
    return;
  }

  try {

    let scanResult = await ODD.scanUrl(ctx.request.body.url)
    
    // TODO add links to download urls file and json file
    delete scanResult.jsonFile
    delete scanResult.urlFile
    
    ctx.body = {
      status: `finished`,
      scanResult,
    };
    
  } catch (err) {
    error(`Error while scanning the URL:`, err)
    ctx.status = 500;
    ctx.body = {
      status: `error`,
      errorMessage: err[0],
      scanResult: err[1],
    }
  }
  
})

app.use(router.routes());