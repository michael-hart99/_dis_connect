// PORT, PATH_TO_SSL
const private_data = require('./private_data');

const fs = require('fs');
const https = require('https');

const WebSocketServer = require('ws').Server;

var origin_time;
var cur_state = 'idle';

var stream_host, jo_stream, projector;
const streamers = new Map();
var cur_id = 0;

const server = https.createServer({
  cert: fs.readFileSync(private_data.PATH_TO_SSL + 'fullchain.pem'),
  key: fs.readFileSync(private_data.PATH_TO_SSL + 'privkey.pem')
});

wss = new WebSocketServer({ server });

server.listen(private_data.PORT);

function originIsAllowed(origin) {
  return true;
}

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
    case 'request-jo-stream':
      server.id = 'jo_stream';
      jo_stream = server;
      console.log('jo_stream connected');
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
  } else if (server.id === 'jo_stream') {
    if (typeof projector !== 'undefined') {
      projector.send(JSON.stringify({
        to: "projector",
        from: "jo_stream",
        action: "disconnect"
      }));
    }
    if (typeof stream_host !== 'undefined') {
      stream_host.send(JSON.stringify({
        to: "stream_host",
        from: "jo_stream",
        action: "disconnect"
      }));
    }
    jo_stream = undefined;
    // origin_time = undefined;
    server.id = undefined;
    console.log('jo_stream disconnected');
  } else {
    streamers.delete(server.id);
    if (typeof stream_host !== "undefined")
      stream_host.send(JSON.stringify({
        to: "stream_host",
        from: server.id,
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
    console.log('error processing the JSON');
  }

  console.log("%s sent '%s' to %s", json.from, json.action, json.to);

  switch (json.action) {
    case 'offer':
      handleOffer(server, json);
      break;
    case 'answer':
      handleAnswer(server, json);
      break;
    case 'candidate':
      handleCandidate(server, json);
      break;
    case 'disconnect':
      handleDisconnect();
      break;
    case 'blackout':
      handleBlackout();
      break;
    case 'begin_video':
      handleBeginVideo();
      break;
    case 'reset_video':
      handleResetVideo();
      break;
    case 'can_stream':
      handleCanStream();
      break;
    default:
      console.log('unexpected action-type: ' + json.action);
  }
}

function handleOffer(server, json) {
  let message = JSON.stringify(json);
  if (json.to === 'projector') {
    if (typeof projector !== "undefined")
      projector.send(message);
  } else if (json.to === 'stream_host') {
    if (typeof stream_host !== "undefined")
      stream_host.send(message);
  } else {
    console.log("%s, %s, %s", json.to, json.from, json.action);
    console.log("can't process offer from " + server.id + "; no stream_host");
  }
}

function handleAnswer(server, json) {
  let message = JSON.stringify(json);
  if (json.to === 'jo_stream') {
    if (typeof jo_stream !== "undefined")
      jo_stream.send(message);
  } else {
    streamers.get(json.to).send(message);
  }
}

function handleCandidate(server, json) {
  let message = JSON.stringify(json);
  if (json.to === 'projector') {
    if (typeof projector !== "undefined")
      projector.send(message);
  } else if (json.to === 'jo_stream') {
    if (typeof jo_stream !== "undefined")
      jo_stream.send(message);
  } else if (json.to === 'stream_host') {
    if (typeof stream_host !== "undefined")
      stream_host.send(message);
  } else {
    console.log("%s %s",json.to, json.from);
    streamers.get(json.to).send(message);
  }
}

function handleDisconnect() {
  if (typeof projector !== "undefined")
      projector.send(JSON.stringify({action: "disconnect"}));
}

function handleBlackout() {
  cur_state = "blackout";
  for (const s of streamers.values()) {
    s.send(JSON.stringify({action: 'blackout'}));
  }
}

function handleBeginVideo() {
  cur_state = "pre-show";
  if (typeof origin_time === 'undefined') {
    origin_time = Date.now();
  }
  for (const s of streamers.values()) {
    s.send(JSON.stringify({
        action: 'begin_video',
        data: origin_time}));
  }
}

function handleCanStream() {
  cur_state = "can_stream";
  for (const s of streamers.values()) {
    s.send(JSON.stringify({action: 'can_stream'}));
  }
}

function handleResetVideo() {
  origin_time = undefined;
  handleBlackout();
}



wss.on('connection', (server, request) => {
  onOpen(server, request.headers["sec-websocket-protocol"]);

  server.on('close', (code, reason) => onClose(server));
  
  server.on('message', onMessage);
});

