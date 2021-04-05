const http = require(`http`)
const https = require(`https`)
const fs = require(`fs`)

require(`dotenv`).config()
const betterLogging = require(`better-logging`)
betterLogging(console, {
  messageConstructionStrategy: betterLogging.MessageConstructionStrategy.FIRST,
})
console.logLevel = process.env.environment === `development` ? 4 : 2
const odd = require(`open-directory-downloader`)
const Koa = require(`koa`)
const router = require(`@koa/router`)()
const forceHTTPS = require('koa-force-https');
const cors = require(`@koa/cors`)
const static = require('koa-static')
const compress = require('koa-compress')
const bodyParser = require(`koa-bodyparser`)
const GuiConnection = require(`./gui-connection`)


// // Listen
// const httpServer = http.createServer(app.callback())
//   .listen(HTTP_PORT, HOST, listeningReporter)
// const httpsServer = https.createServer(app.callback())
//   .listen(HTTPS_PORT, HOST, listeningReporter)
// // A function that runs in the context of the http server
// // and reports what type of server listens on which port
// function listeningReporter () {
//   // `this` refers to the http server here
//   const { address, port } = this.address();
//   const protocol = this.addContext ? 'https' : 'http';
//   console.log(`Listening on ${protocol}://${address}:${port}...`);

const app = new Koa()
// if (process.env.environment !== `development`) {
//   app.use(forceHTTPS());
// }
app.use(cors())
app.use(async (context, next) => {
  if (context.method === `GET` && context.path === `/keepalive`) {
    context.status = 201
    context.body = `Ha, ha, ha, ha\nStayin' alive, stayin' alive`
  }
  await next() // ALWAYS use `await` with next, to wait for other middlewares before sending the response
})
app.use(static(`./public/static`));
app.use(compress({
  br: {
    params: {
      [require(`zlib`).constants.BROTLI_PARAM_QUALITY]: 5
    }
  },
}))
app.use(bodyParser())

let server = http.createServer(app.callback())
server.listen(process.env.PORT)

const indexer = new odd.OpenDirectoryDownloader({
  maximumMemory: process.env.MAX_MEMORY
})
const clients = new GuiConnection(server)

app.use(router.routes());

clients.on(`command`, commandHandler)

async function commandHandler(socketId, command) {

  let end = () => {
    return {
      type: `commandEnd`,
      value: [
        command[0],
      ]
    }
  }
  
  let response = (payload) => {
    return {
      type: `response`,
      value: [
        command[0],
        payload,
      ]
    }
  }

  let error = (reason, additionalPayload) => {
    let errorObject = {
      type: `error`,
      value: [
        command[0],
        reason,
      ]
    }

    if (additionalPayload) {
      errorObject.value.push(additionalPayload)
    }

    return errorObject
    
  }

  switch (command[0]) {
    case `scan`:
      try {

        let url = command[1]
        let advancedOptions

        try {
          checkUrlValid(url)
        } catch (err) {
          clients.send(socketId, error(err.message))
          clients.send(socketId, end())
          return;
        }
        
        try {
          advancedOptions = parseAdvancedOptions(command[2])
        } catch (err) {
          clients.send(socketId, error(err.message))
          clients.send(socketId, end())
          return;
        }
        
        console.info(`Client '${socketId}' requested a scan of '${command[1]}'`)
        
        console.info(`Starting scan of '${command[1]}'`)

        clients.send(socketId, response({
          status: `pending`,
          message: `Scan has been queued`,
        }))

        clients.send(socketId, response({
          status: `running`,
          message: `The Open Directory is now being scanned`
        }))
        
        let scanResult
        try {
          scanResult = await indexer.scanUrl(command[1], {
            keepJsonFile: true,
            keepUrlFile: true,
            ...advancedOptions,
          })
          console.log(`Scan finished.`)
        } catch (err) {

          console.warn(`Indexer threw an error:`, err)

          if (err[0] instanceof odd.ODDError) {

            console.info(`Type of error is 'ODDError'`)

            if (err[0].message.includes(`didn't find any files or directories`)) {
              clients.send(socketId, error(err[0].message))
              clients.send(socketId, end())
              return;
            }
            
          } else if (err[0] instanceof odd.ODDOutOfMemoryError) {

            console.info(`Type of error is 'ODDOutOfMemoryError'`)

            clients.send(socketId, error(`Server ran out of memory!`))
            clients.send(socketId, end())
            return;
            
          } else {
            throw err
          }
          
        }
        
        let newJsonPath = `/scans/${socketId}_${Date.now()}.json`
        let newJsonPathAbsolute = `${__dirname}/public/static${newJsonPath}`
        let newUrlPath = `/scans/${socketId}_${Date.now()}.txt`
        let newUrlPathAbsolute = `${__dirname}/public/static${newUrlPath}`

        try {
          fs.renameSync(scanResult.jsonFile, newJsonPathAbsolute)
          scanResult.jsonFile = newJsonPath
          setTimeout(() => {
            try {
              fs.unlinkSync(newJsonPathAbsolute)
            } catch (err) {
              console.warn(`Couldn't delete scan file:`, err)
            }
          }, 1000*60*process.env.MINUTES_TO_KEEP_SCAN_FILES)
        } catch (err) {
          console.error(`Failed to move scan files:`, err)
          delete scanResult.jsonFile
        }

        try {
          fs.renameSync(scanResult.urlFile, newUrlPathAbsolute)
          scanResult.urlFile = newUrlPath
          setTimeout(() => {
            try {
              fs.unlinkSync(newUrlPathAbsolute)
            } catch (err) {
              console.warn(`Couldn't delete scan file:`, err)
            }
          }, 1000*60*process.env.MINUTES_TO_KEEP_SCAN_FILES)
        } catch (err) {
          console.error(`Failed to move scan files:`, err)
          delete scanResult.urlFile
        }
        
        clients.send(socketId, response({
          status: `finished`,
          scanResult,
        }))
        clients.send(socketId, end())
        
      } catch (err) {

        console.error(`Unknown error ocurred:`, err)
        error(`Error while scanning the URL:`, err)
        clients.send(socketId, error(err[0]?.message, err[1]))

      }
      break;
  
    default:
      break;
  }
  
}

function checkUrlValid(url) {

  try {
    if (!(new URL(url))) {
      throw new Error(`Parameter 'url' is not a valid URL!`)
    }
  } catch (err) {
    throw new Error(`Parameter 'url' is not a valid URL!`)
  }
  
}

function parseAdvancedOptions(rawOptions) {

  let parsedOptions = {}

  if (rawOptions) {

    try {
      rawOptions = JSON.parse(JSON.stringify(rawOptions))
    } catch (err) {
      throw new Error(`Advanced options are not a valid object!`)
    }
    
    if (typeof rawOptions !== `object`) {
      throw new Error(`Advanced options are not a valid object!`)
    }

    parsedOptions.performSpeedtest = rawOptions.speedtest === undefined ? false : rawOptions.speedtest
    parsedOptions.uploadUrlFile = rawOptions.uploadUrlFile === undefined ? false : rawOptions.uploadUrlFile
    parsedOptions.fastScan = rawOptions.fastScan === undefined ? true : rawOptions.fastScan
    parsedOptions.exactSizes = rawOptions.exactSizes === undefined ? false : rawOptions.exactSizes
    parsedOptions.userAgent = rawOptions.userAgent
    parsedOptions.auth = {
      username: rawOptions.auth?.username,
      password: rawOptions.auth?.password,
    }
    
  }

  return parsedOptions
  
}