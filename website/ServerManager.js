'use strict';

const HOST = "www.thejobdance.com";
const PORT = 789;

class ServerManager {
  // TODO
  id;

  // TODO
  _handlers;

  // TODO
  connection;

  /**
   * TODO
   */
  constructor(protocolID) {
    this.id = protocolID;

    this._handlers = new Map();

    this.connection = new WebSocket("wss://" + HOST + ":" + PORT,
                                    "request-" + protocolID);

    this.connection.onerror = (err) => 
        console.log("Error connecting to server");

    let thisObj = this;
    this.connection.onmessage = function(e){ 
      let json = JSON.parse(e.data);
      console.log("received %s from %s", json.action, json.from);
      
      let handler = thisObj._handlers.get(json.action);
      if (handler !== undefined) {
        handler(json);
      } else {
        console.log("Unexpected action received: %s", json.action);
      }
    };
  }

  /**
   * TODO
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * TODO
   */
  setID(id) {
    this.id = id;
  }

  /**
   * TODO
   */
  addHandler(action, fn) {
    this._handlers.set(action, fn);
  }

  /**
   * TODO
   */
  async sendSignal(to, action, data) {
    let count = 0;
    while (this.connection.readyState === 0 && count < 400) {
      await ServerManager.sleep(5);
      count++;
    }
    if (this.connection.readyState === 1) {
      let json = {
        from: this.id,
        to: to,
        action: action,
        data: data
      };
      this.connection.send(JSON.stringify(json));
    }
  }
}

export default ServerManager;

