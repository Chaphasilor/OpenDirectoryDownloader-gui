const WebSocket = require(`ws`)
const EventEmitter = require(`events`)
const uuid = require(`uuid`).v4

module.exports = class GuiConnection extends EventEmitter {

  constructor(server) {

    super()

    //TODO fix port - see https://github.com/heroku-examples/node-ws-test/blob/master/index.js
    this.wss = new WebSocket.Server({
      server,
    })
    this.sockets = new Map()

    this.wss.on(`listening`, () => {
      console.info(`Websocket server ready and listening`)
    })
    
    this.wss.on(`connection`, (socket, request) => {

      let socketId = uuid()
      socket.send(JSON.stringify(socketId))
    
      this.emit(`ready`)
      this.sockets.set(socketId, socket)
      
      socket.on(`message`, (data) => {
    
        let parsed
        try {
          parsed = JSON.parse(data)
        } catch (err) {
          console.error(`err:`, err);
        }
        
        console.log(`data:`, data)
        
        switch (parsed.type) {
          case `command`:
            this.emit(`command`, socketId, parsed.value)
            break;
        
          default:
            console.error(`Unrecognized message type:`, parsed.type)
            break;
        }
        
        // this.emit(`message`, data)
    
      })
    
      socket.on(`error`, (err) => {
        console.error(`err:`, err)
      })
    
      socket.on(`close`, (code, reason) => {

        this.sockets.delete(socketId)
        console.log(`Socket closed with code ${code}, reason:`, reason)
        this.emit(`close`)

      })
      
    })
    
    this.wss.on(`error`, (err) => {
    
      console.error(`err:`, err)
      
    })
    
  }

  send(socketId, payload) {
    
    let socket = this.sockets.get(socketId)
    if (!socket.readyState === 1) {
      throw new Error(`Socket '${socketId}' isn't ready yet!`)
    }
    
    this.sockets.get(socketId).send(JSON.stringify(payload))
    
  }
  
}
