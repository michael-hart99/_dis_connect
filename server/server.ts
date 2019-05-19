import { IncomingMessage } from 'http';
import fs from 'fs';
import https from 'https';

import privateData from './private_data';

const WebSocketServer = require('ws').Server;

interface SmartWebSocket {
  id: string | number;
  send: (message: string) => void;
  on: Function;
}
interface ServerMessage {
  from: string;
  to: string;
  action: string;
  data: string;
}

const server = https.createServer({
  cert: fs.readFileSync(privateData.PATH_TO_SSL + 'fullchain.pem'),
  key: fs.readFileSync(privateData.PATH_TO_SSL + 'privkey.pem'),
});

const wss = new WebSocketServer({ server });
server.listen(privateData.PORT);

let originTime: number;
let curState = 'idle';

let streamHost: SmartWebSocket | undefined,
    controller: SmartWebSocket | undefined,
    projector: SmartWebSocket | undefined;
const streamers = new Map<number, SmartWebSocket>();
let curID = 0;

function onOpen(server: SmartWebSocket,
                request: string | string[] | undefined) {
  switch (request) {
    case 'request-streamHost':
      server.id = 'streamHost';
      streamHost = server;
      console.log('streamHost connected');
      break;
    case 'request-projector':
      server.id = 'projector';
      projector = server;
      console.log('projector connected');
      break;
    case 'request-preshow':
      server.id = curID;
      ++curID;

      server.send(
        JSON.stringify({
          from: 'SERVER',
          to: String(server.id),
          action: 'initialize',
          data: String(server.id) + '|' + curState + '|' + String(originTime),
        })
      );

      streamers.set(server.id, server);
      console.log(server.id + ' connected');
      break;
    case 'request-controller':
      server.id = 'controller';
      controller = server;
      console.log('controller connected');
      break;
    default:
      console.log('unknown connection request: ' + request);
  }
}

function onClose(server: SmartWebSocket) {
  switch (server.id) {
    case 'streamHost':
      streamHost = undefined;
      console.log('streamHost disconnected');
      break;
    case 'projector':
      projector = undefined;
      console.log('projector disconnected');
      break;
    case 'controller':
      if (typeof projector !== 'undefined') {
        projector.send(
          JSON.stringify({
            from: 'controller',
            to: 'projector',
            action: 'disconnect',
          })
        );
      }
      controller = undefined;
      console.log('controller disconnected');
      break;
    default:
      streamers.delete(Number(server.id));
      if (typeof streamHost !== 'undefined') {
        streamHost.send(
          JSON.stringify({
            from: server.id,
            to: 'streamHost',
            action: 'disconnect',
          })
        );
      }

      console.log(server.id + ' disconnected');
  }
}

function onMessage(message: string) {
  // {from, to, action, data}
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
      if (typeof projector !== 'undefined') projector.send(message);
      break;
    case 'controller':
      if (typeof controller !== 'undefined') controller.send(message);
      break;
    case 'streamHost':
      if (typeof streamHost !== 'undefined') streamHost.send(message);
      break;
    case 'all':
      switch (json.action) {
        case 'begin_video':
          if (typeof originTime === 'undefined') {
            originTime = Date.now();
          }
          json.data = String(originTime);
          message = JSON.stringify(json);
          break;
        case 'reset_video':
          originTime = -1;
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
  }
}

wss.on('connection', (server: SmartWebSocket, request: IncomingMessage) => {
  onOpen(server, request.headers['sec-websocket-protocol']);

  server.on('close', () => onClose(server));

  server.on('message', onMessage);
});
