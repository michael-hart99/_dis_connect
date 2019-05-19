'use strict';

const HOST = 'www.thejobdance.com';
const PORT = 789;

export interface ServerMessage {
  from: string;
  to: string;
  action: string;
  data: any;
};

export class ServerManager {
  /* TODO */
  private _id: string;

  /* TODO */
  private _handlers: Map<string, Function>;

  /* TODO */
  private _connection: WebSocket;

  /**
   * TODO
   */
  public constructor(protocolID: string) {
    this._id = protocolID;

    this._handlers = new Map();

    this._connection = new WebSocket(
      'wss://' + HOST + ':' + PORT,
      'request-' + protocolID
    );

    this._connection.onerror = (): void =>
      console.log('Error connecting to server');

    let thisObj = this;
    this._connection.onmessage = (e: MessageEvent): void => {
      let json = JSON.parse(e.data);
      console.log('received %s from %s', json.action, json.from);

      let handler = thisObj._handlers.get(json.action);
      if (handler !== undefined) {
        handler(json);
      } else {
        console.log('Unexpected action received: %s', json.action);
      }
    };
  }

  /**
   * TODO
   */
  public static sleep(ms: number): Promise<void> {
    return new Promise((resolve: Function): number => setTimeout(resolve, ms));
  }

  /**
   * TODO
   */
  public setID(id: string): void {
    this._id = id;
  }

  /**
   * TODO
   */
  public addHandler(action: string, fn: Function): void {
    this._handlers.set(action, fn);
  }

  /**
   * TODO
   */
  public async sendSignal(
    to: string,
    action: string,
    data: any
  ): Promise<void> {
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
        data: data,
      };
      this._connection.send(JSON.stringify(json));
    }
  }
}

export default ServerManager;
