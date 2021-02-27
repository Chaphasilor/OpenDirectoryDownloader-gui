const http = require(`http`)
const https = require(`https`)
const fs = require(`fs`)

require(`dotenv`).config()
const betterLogging = require(`better-logging`)
betterLogging(console, {
  messageConstructionStrategy: betterLogging.MessageConstructionStrategy.FIRST,
})
console.logLevel = process.env.environment === `development` ? 4 : 2
const OpenDirectoryDownloader = require(`open-directory-downloader`)
const Koa = require(`koa`)
const router = require(`@koa/router`)()
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
app.use(cors())
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

const ODD = new OpenDirectoryDownloader()
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

        try {
          if (!(new URL(command[1]))) {
            clients.send(socketId, error(`Parameter 'url' is not a valid URL!`))
            clients.send(socketId, end())
            return;
          }
        } catch (err) {
          clients.send(socketId, error(`Parameter 'url' is not a valid URL!`))
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
        
        let scanResult = await ODD.scanUrl(command[1], {
          keepJsonFile: true,
          keepUrlFile: true,

        })

        console.log(`Scan finished.`)
        
        let newJsonPath = `/scans/${socketId}_${Date.now()}.json`
        let newJsonPathAbsolute = `${__dirname}/public/static/${newJsonPath}`
        let newUrlPath = `/scans/${socketId}_${Date.now()}.txt`
        let newUrlPathAbsolute = `${__dirname}/public/static/${newUrlPath}`

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
        error(`Error while scanning the URL:`, err)
        clients.send(socketId, error(err[0], err[1]))
        clients.send(socketId, end())
      }
      break;
  
    default:
      break;
  }
  
}