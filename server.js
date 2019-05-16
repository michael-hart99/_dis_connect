const private_data = require('./private_data');

const fs = require('fs');
const https = require('https');

const WebSocketServer = require('ws').Server;


const server = https.createServer({
  cert: fs.readFileSync(private_data.PATH_TO_SSL + 'fullchain.pem'),
  key: fs.readFileSync(private_data.PATH_TO_SSL + 'privkey.pem')
});

wss = new WebSocketServer({ server });
server.listen(private_data.PORT);


var origin_time;
var cur_state = 'idle';

var stream_host, controller, projector;
const streamers = new Map();
var cur_id = 0;


function onOpen(server, request) {
  switch(request) {
    case 'request-stream-host':
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

function onClose(server) {
  if (server.id === 'stream_host') {
    stream_host = undefined;
    server.id = undefined;
    console.log('stream_host disconnected');
  } else if (server.id === 'projector') {
    projector = undefined;
    server.id = undefined;
    console.log('projector disconnected');
  } else if (server.id === 'controller') {
    if (typeof projector !== 'undefined') {
      projector.send(JSON.stringify({
        from: "controller",
        to: "projector",
        action: "disconnect"
      }));
    }
    controller = undefined;
    server.id = undefined;
    console.log('controller disconnected');
  } else {
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

function onMessage(message) {
  // {from, to, action, data}
  let json;
  try {
    json = JSON.parse(message);
  } catch (e) {
    console.log('error processing as JSON: %s', message);
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
          origin_time = undefined;
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
      const streamer = streamers.get(json.to);
      if (streamer !== undefined) {
        streamer.send(message);
      } else {
        console.log("Unable to find addressee '%s'", json.to);
      }
  }
}


wss.on('connection', (server, request) => {
  onOpen(server, request.headers["sec-websocket-protocol"]);

  server.on('close', (code, reason) => onClose(server));
  
  server.on('message', onMessage);
});

