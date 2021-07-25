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
const Router = require(`@koa/router`)
const forceHTTPS = require('koa-force-https');
const cors = require(`@koa/cors`)
const static = require('koa-static')
const compress = require('koa-compress')
const bodyParser = require(`koa-bodyparser`)

const GuiConnection = require(`./gui-connection`)
const util = require(`./util`)
const mount = require('koa-mount')

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

const staticServer = new Koa()
staticServer.use(static(`./public/dist`));
const scanServer = new Koa()
scanServer.use(static(`./scans`));
app.use(mount(`/`, staticServer));
app.use(mount(`/scans`, scanServer));

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
        let otherOptions

        try {
          checkUrlValid(url)
        } catch (err) {
          clients.send(socketId, error(err.message))
          clients.send(socketId, end())
          return;
        }
        
        try {
          const parsedOptions = parseAdvancedOptions(command[2])
          oddOptions = parsedOptions.parsedOptionsODD
          otherOptions = parsedOptions.parsedOptionsOther
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
            ...oddOptions,
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
        let newJsonPathAbsolute = `${__dirname}${newJsonPath}`
        let newUrlPath = `/scans/${socketId}_${Date.now()}.txt`
        let newUrlPathAbsolute = `${__dirname}${newUrlPath}`

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

        // upload scan if option enabled
        if (otherOptions.uploadScan) {
          util.uploadScan(newJsonPathAbsolute)
          .catch(err => {
            console.warn(err)
          })
        }
        
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

  let parsedOptionsODD = {}
  let parsedOptionsOther = {}

  if (rawOptions) {

    try {
      rawOptions = JSON.parse(JSON.stringify(rawOptions))
    } catch (err) {
      throw new Error(`Advanced options are not a valid object!`)
    }
    
    if (typeof rawOptions !== `object`) {
      throw new Error(`Advanced options are not a valid object!`)
    }

    parsedOptionsODD.performSpeedtest = rawOptions.speedtest === undefined ? false : rawOptions.speedtest
    parsedOptionsODD.uploadUrlFile = rawOptions.uploadUrlFile === undefined ? false : rawOptions.uploadUrlFile
    parsedOptionsODD.fastScan = rawOptions.fastScan === undefined ? true : rawOptions.fastScan
    parsedOptionsODD.exactSizes = rawOptions.exactSizes === undefined ? false : rawOptions.exactSizes
    parsedOptionsODD.userAgent = rawOptions.userAgent
    parsedOptionsODD.auth = {
      username: rawOptions.auth?.username,
      password: rawOptions.auth?.password,
    }

    parsedOptionsOther.uploadScan = rawOptions.exactSizes === undefined ? false : rawOptions.uploadScan
    
  }

  return { parsedOptionsODD, parsedOptionsOther }
  
}