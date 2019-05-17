'use strict';

const HOST = "www.thejobdance.com";
const PORT = 789;

class ServerManager {
  // TODO
  _id : string | number;

  // TODO
  _handlers : Map<string, Function>;

  // TODO
  _connection : WebSocket;

  /**
   * TODO
   */
  constructor(protocolID : string) {
    this._id = protocolID;

    this._handlers = new Map();

    this._connection = new WebSocket("wss://" + HOST + ":" + PORT,
                                     "request-" + protocolID);

    this._connection.onerror = () => 
        console.log("Error connecting to server");

    let thisObj = this;
    this._connection.onmessage = function(e){ 
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
  static sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * TODO
   */
  setID(id : string | number) {
    this._id = id;
  }

  /**
   * TODO
   */
  addHandler(action : string, fn : Function) {
    this._handlers.set(action, fn);
  }

  /**
   * TODO
   */
  async sendSignal(to : string | number, action : string, data : any) {
    let count = 0;
    while (this._connection.readyState === 0 && count < 400) {
      await ServerManager.sleep(5);
      count++;
    }
    if (this._connection.readyState === 1) {
      let json = {
        from: this._id,
        to: to,
        action: action,
        data: data
      };
      this._connection.send(JSON.stringify(json));
    }
  }
}

export default ServerManager;
