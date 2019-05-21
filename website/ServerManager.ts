'use strict';

import { HOST, PORT, ServerMessage, PacketData } from '../server/ServerInfo';

/**
 * Returns a promise that resolves in a given number of milliseconds.
 *
 * @param {number} ms The number of milliseconds before the returned promise
 *      resolves.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve: Function): number => setTimeout(resolve, ms));
}

/**
 * PartialMessage represents a message that doesn't have "from" information.
 *     This is likely because the connection hasn't transmitted it's ID.
 */
interface PartialMessage {
  to: string;
  action: string;
  data: PacketData;
}

/**
 * ServerManager is a wrapper around a Websocket connection that will format
 *     messages to be readable by the signalling server. ServerManager also
 *     will interpret messages and send responses to proper handler functions.
 *
 * The server this is connected to is known as a signalling server and will
 *     route messages to addressed connections.
 */
export class ServerManager {
  /** The ID of this server connection. This is supplied by the server. */
  private _id: string | null;

  /** If true, this connection is ready to send and receive messages. */
  private _ready: boolean;

  /** A mapping from action names to handler functions used to route signals
      to functions that will handle the response. */
  private _handlers: Map<string, Function>;

  /** The signalling server connection. */
  private _connection: WebSocket;

  /** Messages sent while the server connection was not ready. */
  private _unsentMessages: PartialMessage[];

  /**
   * Instantiates the signalling server connection.
   *
   * @param {string} requestLabel The identifying label of this request.
   */
  public constructor(requestLabel: string) {
    this._id = null;

    this._ready = false;

    this._handlers = new Map();

    this._connection = new WebSocket(
      'wss://' + HOST + ':' + PORT,
      'request-' + requestLabel
    );

    this._connection.onerror = (): void =>
      console.log('Error connecting to server');

    // Set onmessage to route the message through a handler function
    let thisObj = this;
    this._connection.onmessage = (e: MessageEvent): void => {
      let json: ServerMessage = JSON.parse(e.data);
      console.log('received %s from %s', json.action, json.from);

      let handler = thisObj._handlers.get(json.action);
      if (handler !== undefined) {
        handler(json);
      } else {
        console.log('Unexpected action received: %s', json.action);
      }
    };

    this._unsentMessages = [];

    // Add a handler to handle the initial data sent by the server.
    this.addHandler(
      '_initialize',
      (json: ServerMessage): void => {
        this._id = json.data as string;
        this._ready = true;
        this._handlers.delete('_initialize');

        let message: PartialMessage | undefined;
        while ((message = this._unsentMessages.pop())) {
          this.sendSignal(message.to, message.action, message.data);
        }
      }
    );
  }

  /**
   * Returns if the server is ready to transmit messages. Note that messages
   *     can still be received even if they can't be transmitted.
   *
   * @returns {boolean} True if the server is ready to send messages.
   */
  public isReady(): boolean {
    return this._ready;
  }

  /**
   * Add a handler function to a specified action. Any incoming messages
   *     requesting this action will be routed to the given function.
   *
   * @param {string}   action The action the given function should handle.
   * @param {Function} fn     The function that will handle the message.
   */
  public addHandler(action: string, fn: Function): void {
    this._handlers.set(action, fn);
  }

  /**
   * Send a message requesting action to a specified recipient.
   *
   * @param {string}     to     The addressee of the message.
   * @param {string}     action The type of action to take.
   * @param {PacketData} data   Any data needed to perform the action.
   */
  public async sendSignal(
    to: string,
    action: string,
    data: PacketData
  ): Promise<void> {
    if (this._ready) {
      let count = 0;
      while (this._connection.readyState === 0 && count < 400) {
        await sleep(5);
        count++;
      }
      if (this._connection.readyState === 1 && this._id) {
        let message: ServerMessage = {
          from: this._id,
          to: to,
          action: action,
          data: data,
        };
        this._connection.send(JSON.stringify(message));
      }
    } else {
      let message: PartialMessage = {
        to: to,
        action: action,
        data: data,
      };
      this._unsentMessages.push(message);
    }
  }
}

export default ServerManager;
