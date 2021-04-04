export default class API extends EventTarget {

  constructor(url) {

    super()
    
    this.url = url
    this.activeCommands = []

    this.generateEventListenerFunction = (callback) => (payload) => callback(payload.detail)

  }

  emit(eventName, payload) {
    this.dispatchEvent(new CustomEvent(eventName, {detail: payload}));
  }

  on(eventName, callback) {
    this.addEventListener(eventName, this.generateEventListenerFunction(callback))
  }

  off(eventName, callback) {
    this.removeEventListener(eventName, this.generateEventListenerFunction(callback))
  }

  parseMessage(message) {

    // console.log(`message:`, message);
    
    try {
      return JSON.parse(message.data)
    } catch (err) {
      throw new Error(`Couldn't parse message:`, err)
    }

  }

  get connected() {
    return this.socket != undefined && this.socket.readyState === WebSocket.OPEN
  }

  /**
   * ### Connects to the backend API
   * @resolves undefined
   * @rejects {Error} the reason why the connection couldn't be established
   */
   connectToServer() {
    return new Promise((resolve, reject) => {

      if (this.connected) {
        return resolve()
      }

      console.info(`Connecting to websocket at '${this.url}'`)
      try {
        this.socket = new WebSocket(this.url)
      } catch (err) {
        clearInterval(this.pingIntervalId) // clear keep-alive interval
        throw err
      }
  
      this.socket.onopen = () => {
        

        if (this.socket.readyState === WebSocket.OPEN) {

          console.info(`Socket opened!`)
          
          // upon connection, the server will send its assigned socket ID over the socket
          // wait for it, save it and then resolve
          this.socket.onmessage = (message) => {
            this.connectionId = JSON.parse(message.data)
            return resolve()
          }

          clearInterval(this.pingIntervalId) // clear old keep-alive interval
          // send a keep-alive message over the socket every 10 seconds to prevent socket timeouts in Firefox
          this.pingIntervalId = setInterval(() => {
            this.socket.send(JSON.stringify({type: `keepalive`}))
          }, 1000*10);

        } else {
          return reject(new Error(`Socket opened but isn't ready`))
        }

        // overwrite the previous onclose-handler after the socket is connected
        this.socket.onclose = (event) => {
          clearInterval(this.pingIntervalId) // clear keep-alive interval
          alert(`Lost connection to server! (Code: '${event.code}', Reason: '${event.reason}')`)
        }
        
      }

      // if the socket didn't open but threw an error
      this.socket.onerror = (error) => {
        clearInterval(this.pingIntervalId) // clear keep-alive interval
        return reject(error)
      }

      // if the socket closed without opening first. unlikely to happen
      this.socket.onclose = () => {
        clearInterval(this.pingIntervalId) // clear keep-alive interval
        return reject(new Error(`Can't connect to server!`))
      }

    })
  }

  /**
   * ### Sends data to the backend API
   * Mostly for debug, not actually used currently
   * @param {Object} data the payload to send over the socket
   * @param {Function} responseHandler a callback that receives any responses from the server, until this method is called again
   */
  async send(data, responseHandler) {
    
    // console.debug(`this.connected:`, this.connected);
    
    // make sure we are connected to the backend API before sending any data
    if (!this.connected) {

      try {
        await this.connectToServer()
      } catch (err) {
        throw new Error(`Fatal: Failed to open websocket:`, err)
      }
      
    }
    
    // stringify the data and send it over the socket
    this.socket.send(JSON.stringify(data))

    // register the callback as a message handler (parse the received message before calling the callback)
    this.socket.onmessage = (message) => {
      responseHandler(this.parseMessage(message))
    }

  }

  /**
   * ### Sends a command to the API and allows to handle responses to the command
   * @param {String} command the commmand to send to the server
   * @param {Object} payload the payload to send alongside the command
   * @param {Function} responseHandler a callback for handling responses *to this command only*
   */
  async sendCommand(command, payload, responseHandler, errorHandler) {
    
    // make sure we are connected to the backend API
    if (!this.connected) {

      try {
        await this.connectToServer()
      } catch (err) {
        throw new Error(`Fatal: Failed to open websocket:`, err)
      }
      
    }
    
    // format the command and payload, then send it
    this.socket.send(JSON.stringify({
      type: `command`,
      value: [
        command,
        ...payload
      ]
    }))

    // remember the command by adding it and its responseHandler to `this.activeCommands` for later reference
    this.activeCommands.push({
      name: command,
      handler: responseHandler,
      errorHandler: errorHandler,
    })

    // handle responses by the server
    // this includes responses to *all* commands
    this.socket.onmessage = (message) => {

      let parsed = this.parseMessage(message)

      // find the command to which the server replied to 
      let command = this.activeCommands.find(x => x.name === parsed.value[0])
  
      // if the command isn't part of `this.activeCommands`, ignore it
      if (!command) {
        throw new Error(`Command not found: ${command}`)
      }
  
      // detect the type of the reply and handle accordingly
      switch (parsed.type) {
        case `response`:
            // if the reply is a response, invoke the active command's response handler
            command.handler(parsed.value[1])    
          break;
        case `commandEnd`:
          // if the reply is a command end, remove the command from the active commands
          this.activeCommands = this.activeCommands.filter(x => x !== command)
          break;
      
        case `error`:
          // error ocurred, but command hasn't ended yet
          console.error(`Command '${parsed.value[0]}' threw an error:`, parsed.value[1])
          command.errorHandler({
            reason: parsed.value[1],
            additionalPayload: parsed.value.length > 2 ? parsed.value[2] : undefined,
          })
          break;
      
        default:
          break;
      }
    
      
    }

  }
  
  async scanUrl(url, advancedOptions) {

    await this.sendCommand(`scan`,
      [url, advancedOptions],
      (response) => {

        this.emit(`scanUpdate`, response)

      },
      (err) => {
        console.log(`err:`, err)
        this.emit(`scanError`, err)
      }
    )
    
  }

}