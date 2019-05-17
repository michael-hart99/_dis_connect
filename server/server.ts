import { IncomingMessage } from "http";

const private_data = require('./private_data');

const fs = require('fs');
const https = require('https');

const WebSocketServer = require('ws').Server;


type SmartWebSocket = {
  id: string | number,
  send: (message : string) => void,
  on: Function
}
type ServerMessage = {
  from: string | number,
  to: string | number,
  action: string,
  data: any
}


const server = https.createServer({
  cert: fs.readFileSync(private_data.PATH_TO_SSL + 'fullchain.pem'),
  key: fs.readFileSync(private_data.PATH_TO_SSL + 'privkey.pem')
});

const wss = new WebSocketServer({ server });
server.listen(private_data.PORT);


let origin_time : number;
let cur_state = 'idle';

let stream_host : SmartWebSocket | undefined,
    controller : SmartWebSocket | undefined,
    projector : SmartWebSocket | undefined;
const streamers = new Map<number, SmartWebSocket>();
var cur_id = 0;

function onOpen(server : SmartWebSocket, request : string | string[] | undefined) {
  switch(request) {
    case 'request-stream_host':
      server.id = 'stream_host';
      stream_host = server;
      console.log('stream_host connected');
      break;
    case 'request-projector':
      server.id = 'projector';
      projector = server;
      console.log('projector connected');
      break;
    case 'request-preshow':
      server.id = cur_id;
      ++cur_id;
      
      server.send(JSON.stringify({
        from: "SERVER",
	      to: server.id,
	      action: "initialize",
	      data: {id: server.id,
               state: cur_state,
               origin_time: origin_time}
      }));

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

function onClose(server : SmartWebSocket) {
  switch (server.id) {
    case 'stream_host':
      stream_host = undefined;
      console.log('stream_host disconnected');
      break;
    case 'projector':
      projector = undefined;
      console.log('projector disconnected');
      break;
    case 'controller':
      if (typeof projector !== 'undefined') {
        projector.send(JSON.stringify({
          from: "controller",
          to: "projector",
          action: "disconnect"
        }));
      }
      controller = undefined;
      console.log('controller disconnected');
      break;
    default:
      if (typeof server.id === "number") {
        streamers.delete(server.id);
        if (typeof stream_host !== "undefined")
          stream_host.send(JSON.stringify({
            from: server.id,
            to: "stream_host",
            action: "disconnect"
          }));
        console.log(server.id + ' disconnected');
      }
  }
}

function onMessage(message : string) {
  // {from, to, action, data}
  let json : ServerMessage;
  try {
    json = JSON.parse(message);
  } catch (e) {
    console.log('error processing as JSON: %s', message);
    return;
  }

  console.log("%s sent '%s' to %s", json.from, json.action, json.to);
  
  switch (json.to) {
    case 'projector':
      if (typeof projector !== "undefined")
        projector.send(message);
      break;
    case 'controller':
      if (typeof controller !== "undefined")
        controller.send(message);
      break;
    case 'stream_host':
      if (typeof stream_host !== "undefined")
        stream_host.send(message);
      break;
    case 'all':
      switch (json.action) {
        case 'begin_video':
          if (typeof origin_time === 'undefined') {
            origin_time = Date.now();
          }
          json.data = origin_time;
          message = JSON.stringify(json);
          break;
        case 'reset_video':
          origin_time = -1;
          json.action = 'blackout';
          message = JSON.stringify(json);
          break;
      }
      cur_state = json.action;
      for (const s of streamers.values()) {
        s.send(message);
      }
      break;
    default:
      if (typeof json.to === "number") {
        const streamer = streamers.get(json.to);
        if (streamer !== undefined) {
          streamer.send(message);
        } else {
          console.log("Unable to find addressee '%s'", json.to);
        }
      }
  }
}


wss.on('connection', (server : SmartWebSocket, request : IncomingMessage) => {
  onOpen(server, request.headers["sec-websocket-protocol"]);

  server.on('close', () => onClose(server));
  
  server.on('message', onMessage);
});

