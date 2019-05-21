import { IncomingMessage } from 'http';
import fs from 'fs';
import https from 'https';
import ws from 'ws';

import { PORT, SSL_CERT, SSL_KEY, ServerMessage } from './ServerInfo';

/**
 * A wrapper for a WebSocket that adds an ID.
 */
interface SmartWebSocket {
  id: string | undefined;
  send: (message: string) => void;
  on: Function;
}

// The server that listens for connections
const server = https.createServer({
  cert: fs.readFileSync(SSL_CERT),
  key: fs.readFileSync(SSL_KEY),
});

// A WebSocketServer formed from the HTTPS server
const socketServer = new ws.Server({ server });
server.listen(PORT);

// The time when the video was started (used to sync the video playback)
let originTime: number | null = null;

// The current state of preshowvideo
let curState = 'idle';

// The definite server connections
let streamHost: SmartWebSocket | undefined,
  controller: SmartWebSocket | undefined,
  projector: SmartWebSocket | undefined;

// The audience's connections
const streamers = new Map<number, SmartWebSocket>();
// The ID that will be given to the next audience connection
let curID = 0;

/**
 * A function intended to be executed when a new connection is opened.
 *     Sends initializing data and stores the connection.
 *
 * @param {SmartWebSocket}                server  The server that was opened.
 * @param {string | string[] | undefined} request The header of the connection.
 */
function onOpen(
  server: SmartWebSocket,
  request: string | string[] | undefined
): void {
  switch (request) {
    case 'request-streamHost':
      server.id = 'streamHost';
      streamHost = server;
      break;
    case 'request-projector':
      server.id = 'projector';
      projector = server;
      break;
    case 'request-preshow':
      server.id = String(curID);
      streamers.set(curID, server);
      ++curID;
      server.send(
        JSON.stringify({
          from: 'SERVER',
          to: server.id,
          action: 'setState',
          data: {
            state: curState,
            originTime: originTime,
          },
        })
      );
      break;
    case 'request-controller':
      server.id = 'controller';
      controller = server;
      break;
  }
  if (server.id) {
    console.log(server.id + ' connected');
    server.send(
      JSON.stringify({
        from: 'SERVER',
        to: server.id,
        action: '_initialize',
        data: server.id,
      })
    );
  } else {
    console.log('unknown connection request: ' + request);
  }
}

/**
 * A function intended to be executed when a connection is closed. Resets all
 *     data used to store that connection.
 *
 * @param {SmartWebSocket} server The server that has disconnected.
 */
function onClose(server: SmartWebSocket): void {
  switch (server.id) {
    case 'streamHost':
      streamHost = undefined;
      break;
    case 'projector':
      projector = undefined;
      break;
    case 'controller':
      // Send a message to disconnect the stream in case it is still live
      if (projector) {
        projector.send(
          JSON.stringify({
            from: 'controller',
            to: 'projector',
            action: 'disconnect',
            data: null,
          })
        );
      }
      controller = undefined;
      break;
    default:
      // Send a message to disconnect the stream in case it is still live
      if (streamHost) {
        streamHost.send(
          JSON.stringify({
            from: server.id,
            to: 'streamHost',
            action: 'disconnect',
            data: null,
          })
        );
      }
      streamers.delete(Number(server.id));
      break;
  }

  console.log(server.id + ' disconnected');
}

/**
 * A function intended to be executed when the connection receives a message.
 *     Routes the message to the intended recipient.
 *
 * @param {string} message The received ServerMessage formatted as a string.
 */
function onMessage(message: string): void {
  let json: ServerMessage;
  try {
    json = JSON.parse(message);
  } catch (e) {
    console.log('error processing as JSON: %s', message);
    return;
  }

  console.log("%s sent '%s' to %s", json.from, json.action, json.to);

  switch (json.to) {
    case 'projector':
      if (projector) projector.send(message);
      break;
    case 'controller':
      if (controller) controller.send(message);
      break;
    case 'streamHost':
      if (streamHost) streamHost.send(message);
      break;
    case 'all':
      switch (json.action) {
        case 'beginVideo':
          if (originTime === null) {
            originTime = Date.now();
          }
          json.data = originTime;
          message = JSON.stringify(json);
          break;
        case 'resetVideo':
          originTime = null;
          json.action = 'blackout';
          message = JSON.stringify(json);
          break;
      }

      curState = json.action;
      for (const s of streamers.values()) {
        s.send(message);
      }
      break;
    default:
      const streamer = streamers.get(Number(json.to));
      if (streamer) {
        streamer.send(message);
      } else {
        console.log("Unable to find addressee '%s'", json.to);
      }
      break;
  }
}

// Set the earlier functions to run on corresponding server events
socketServer.on(
  'connection',
  (server: SmartWebSocket, request: IncomingMessage): void => {
    onOpen(server, request.headers['sec-websocket-protocol']);

    server.on('close', (): void => onClose(server));

    server.on('message', onMessage);
  }
);
