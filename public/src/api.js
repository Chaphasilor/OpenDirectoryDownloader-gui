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

  connectToServer() {
    return new Promise((resolve, reject) => {

      console.info(`Connecting to websocket at ${this.url}`)
      this.socket = new WebSocket(this.url)
  
      this.socket.onopen = () => {
        if (this.socket.readyState === WebSocket.OPEN) {

          console.log(`Socket opened!`)
          
          this.socket.onmessage = (message) => {
            this.connectionId = JSON.parse(message.data)
            return resolve()
          }

        } 
      }

      this.socket.onerror = (error) => {
        return reject(error)
      }
    
    })
  }

  async send(data, responseHandler) {
    
    console.log(`this.connected:`, this.connected);
    
    if (!this.connected) {

      try {
        await this.connectToServer()
      } catch (err) {
        throw new Error(`Fatal: Failed to open websocket:`, err)
      }
      
    }
    
    this.socket.send(JSON.stringify(data))

    this.socket.onmessage = (message) => {
      responseHandler(this.parseMessage(message))
    }

  }

  async sendCommand(command, payload, responseHandler, errorHandler) {
    
    if (!this.connected) {

      try {
        await this.connectToServer()
      } catch (err) {
        throw new Error(`Fatal: Failed to open websocket:`, err)
      }
      
    }
    
    this.socket.send(JSON.stringify({
      type: `command`,
      value: [
        command,
        ...payload
      ]
    }))
    this.activeCommands.push({
      name: command,
      handler: responseHandler,
      errorHandler: errorHandler,
    })

    this.socket.onmessage = (message) => {

      let parsed = this.parseMessage(message)

      console.log(`parsed:`, parsed);
  
      let command = this.activeCommands.find(x => x.name === parsed.value[0])
  
      if (!command) {
        throw new Error(`Command not found: ${command}`)
      }
  
      switch (parsed.type) {
        case `response`:
            command.handler(parsed.value[1])
          break;
        case `commandEnd`:
          this.activeCommands = this.activeCommands.filter(x => x !== command)
          break;
      
        case `error`:
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