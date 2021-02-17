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
const static = require('koa-static')
const compress = require('koa-compress')
const bodyParser = require(`koa-bodyparser`)

const GuiConnection = require(`./gui-connection`)

const ODD = new OpenDirectoryDownloader()
const app = new Koa()
const clients = new GuiConnection()

app.use(cors())
app.use(static(`./www/static`));
app.use(compress({
  br: {
    params: {
      [require(`zlib`).constants.BROTLI_PARAM_QUALITY]: 5
    }
  },
}))
app.use(bodyParser())
app.listen(process.env.PORT)

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

clients.on(`command`, commandHandler)

async function commandHandler(socketId, command) {

  switch (command[0]) {
    case `scan`:
      try {

        info(`Client '${socketId}' requested a scan of '${command[1]}'`)
        info(`Starting scan of '${command[1]}'`)
        let scanResult = await ODD.scanUrl(command[1])
        
        // TODO add links to download urls file and json file
        delete scanResult.jsonFile
        delete scanResult.urlFile
        
        clients.send(socketId, 
          {
            type: `response`,
            value: [
              command[0],
              {
                status: `finished`,
                scanResult,
              },
            ]
          }
        )
        
      } catch (err) {
        error(`Error while scanning the URL:`, err)
        clients.send(socketId, 
          {
            type: `error`,
            value: [
              command[0],
              err[0],
              err[1]
            ]
          }
        )
      }
      break;
  
    default:
      break;
  }
  
}