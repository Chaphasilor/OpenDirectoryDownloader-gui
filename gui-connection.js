const WebSocket = require(`ws`)
const EventEmitter = require(`events`)
const uuid = require(`uuid`).v4

module.exports = class GuiConnection extends EventEmitter {

  /**
   * ### Creates a new WebSocket server, allowing clients to connect to the backend
   * @param {http.Server} server The existing http server to bind the WebSocket server to
   */
  constructor(server) {

    super() // initialize the underlying event emitter

    // create a new WebSocket server from the passed http server
    this.wss = new WebSocket.Server({
      server,
    })
    this.sockets = new Map() // maps socket IDs to the actual sockets
    this.subscriptions = {} // stores all commands and their respective subscribe clients

    this.wss.on(`listening`, () => {
      console.info(`Websocket server ready and listening on port ${process.env.PORT}`)
      this.emit(`ready`)
    })
    
    // handle a new client connection
    this.wss.on(`connection`, (socket, request) => {

      let socketId = uuid() // generate a unique id for the client/socket
      socket.send(JSON.stringify(socketId)) // send the id back to the client, could be useful in the future
    
      this.sockets.set(socketId, socket) // store the socket for future reference
      this.emit(`new-client`, socketId) // notify the consumer of the GuiConnection class about the new client connection, along with its ID
      
      // handle messages received from the client
      socket.on(`message`, (data) => {
    
        let parsed
        try {
          parsed = JSON.parse(data)
        } catch (err) {
          console.error(`Failed to parse message from client:`, err);
        }
        
        if (parsed && parsed.type) {
          
          switch (parsed.type) {
            case `command`:
              this.emit(`command`, socketId, parsed.value)
              break;
            case `keepalive`:
              // ignore, it's just to keep the socket open 
              break;
          
            default:
              console.error(`Unrecognized message type:`, parsed.type)
              break;
          }
          
        } else {
          console.warn(`Received malformed websocket message:`, data)
        }
        
      })
    
      socket.on(`error`, (err) => {
        console.error(`Error from socket '${socketId}':`, err)
      })
    
      socket.on(`close`, (code, reason) => {

        this.unsubscribe(socketId) // make sure to delete all subscriptions for that client/socket before deleting it
        this.sockets.delete(socketId) // delete the reference to the socket
        console.debug(`this.sockets:`, this.sockets)
        console.warn(`Socket closed with code ${code}, reason:`, reason)
        this.emit(`close`, socketId) // notify the consumer of the GuiConnection class about the closed socket, including its (former) ID

      })
      
    })
    
    // could be that this old handler isn't cleared before the new handler is added when a connection is established. welp.
    this.wss.on(`error`, (err) => {
      console.error(`Error with the websocket:`, err)
    })
    
  }

  /**
   * ### Sends a reply to a client
   * Currently the payload is just forwarded to the client (after being converted to a JSON string)  
   * This could be improved by building the actual reply inside this method and only accepting certain parameters of the reply, like the packets to be sent or the name of the command (look at the `API.send()` method inside the frontend's API class for an example)
   * @param {String} socketId The ID of the client connection
   * @param {Object} payload The reply to be sent to the client
   */
  send(socketId, payload) {
    
    // check if one of the parameters is omitted
    if (socketId === undefined || payload === undefined) {
      throw new Error(`Missing socket ID or payload!`)
    }

    const stringifiedPayload = JSON.stringify(payload)  // convert the object to a JSON string to send over the socket

    let socket = this.sockets.get(socketId) // load the socket by using the provided ID
    if (!socket) {
      throw new Error(`Socket with id '${socketId} not found!'`)
    }
    if (socket.readyState !== 1) {
      throw new Error(`Socket '${socketId}' isn't ready yet!`)
    }
    
    socket.send(stringifiedPayload) // send the payload string
    
  }

  /**
   * ### Broadcasts a reply to a specific command to all subscribed clients
   * @param {String} command The command to which this broadcast replies
   * @param {Object} payload The reply to be broadcasted to all subscribed clients
   */
  broadcast(command, payload) {

    if (command === undefined || payload === undefined) {
      throw new Error(`Missing command name or payload!`)
    }

    // console.info(`Broadcasting...`)

    const stringifiedPayload = JSON.stringify(payload) // convert the object to a JSON string to send over the socket
      
    // check if the command exists inside the subscriptions object. if not, no client has been subscribed to this command yet
    if (this.subscriptions[command]) {

      // get all socket IDs subscribed to that command and send the payload to each of them
      this.subscriptions[command].forEach(socketId => {

        // additional error handling just in case
        let socket = this.sockets.get(socketId)
        if (!socket) {
          throw new Error(`Socket with id '${socketId} not found!'`)
        }
        if (socket.readyState !== 1) {
          throw new Error(`Socket '${socketId}' isn't ready yet!`)
        }
        
        socket.send(stringifiedPayload)
        
      })

    }
    
  }

  /**
   * ### Subscribes a client/socket to all broadcasts for a specific command  
   *   
   * Subscriptions are handled by the outside for now (message event -> consumer of the GuiConnection class handles the message (command, etc.) -> calls this `subscribe()`-method)  
   * This should be changed in the future to make subscription management simpler
   * @param {String} socketId The ID of the client connection
   * @param {String} command The command to subscribe the client to
   */
  subscribe(socketId, command) {

    if (this.subscriptions[command]) {
      this.subscriptions[command].push(socketId)
    } else {
      this.subscriptions[command] = [socketId]
    }

    console.log(`Subscribed '${socketId}' to '${command}'!`)
    
  }

  /**
   * ### Unsubscribes a client/socket from all broadcasts for a specific command  
   *   
   * (Un)subscriptions are handled by the outside for now (message event -> consumer of the GuiConnection class handles the message (command, etc.) -> calls this `unsubscribe()`-method)  
   * This should be changed in the future to make subscription management simpler
   * @param {String} socketId The ID of the client connection
   * @param {String} [command] The command to unsubscribe the client from
   */
  unsubscribe(socketId, command = null) {

    // if no command is specified, unsubscribe from all commands
    if (!command) {
      
      Object.keys(this.subscriptions).forEach(command => {
        console.debug(`command:`, command)
        console.debug(`this.subscriptions:`, this.subscriptions)
        this.subscriptions[command] = this.subscriptions[command].filter(x => x !== socketId) // filter out this socket from the subscribed sockets
      })
      
    } else {

      // unsubscribe from a single command
      if (this.subscriptions[command]) {
        this.subscriptions[command] = this.subscriptions[command].filter(x => x !== socketId) // filter out this socket from the subscribed sockets
      }

    }

    console.log(`Unsubscribed '${socketId}' from '${command}'!`)
    
  }
  
}
