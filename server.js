// PORT, PATH_TO_SSL
const private_data = require('./private_data');

const fs = require('fs');
const https = require('https');

const WebSocketServer = require('ws').Server;
var viewer;
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
    case 'request-view':
      server.id = 'viewer';
      viewer = server;
      console.log('viewer connected');
      break;
    case 'request-stream':
      server.id = cur_id;
      ++cur_id;
      
      streamers.set(server.id, server);
      console.log(server.id + ' connected');
      break;
    default:
     console.log('unknown connection request: ' + request);
  }
}
function onClose(server) {
  if (server.id === 'viewer') {
    server.id = undefined;
    console.log('Viewer disconnected');
  } else {
    streamers.delete(server.id);
    console.log(server.id + ' disconnected');
  }
}

function handleOffer(server, offer) {
  let message = JSON.stringify(offer);
  if (viewer !== undefined) {
    viewer.send(message);
  } else {
    console.log("can't process offer from " + server.id + "; no viewer");
  }
}
function handleAnswer(server, answer) {
  let message = JSON.stringify(answer);
  streamers.forEach(x => x.send(message));
}
function handleCandidate(server, candidate) {
  let message = JSON.stringify(candidate);
  if (server.id == 'viewer') {
    streamers.forEach(x => x.send(message));
  } else {
    viewer.send(message);
  }
}

wss.on('connection', (server, request) => {
  onOpen(server, request.headers["sec-websocket-protocol"]);

  server.on('close', (code, reason) => onClose(server));
  
  server.on('message', (message) => {
    // {action, data}
    let json;
    try {
      json = JSON.parse(message);
    } catch (e) {
      console.log('error processing the JSON');
    }

    if (json.action === 'offer') {
      handleOffer(server, json);
    } else if (json.action === 'answer') {
      handleAnswer(server, json);
    } else if (json.action === 'candidate') {
      handleCandidate(server, json);
    } else {
      console.log('unexpected action-type: ' + json.action);
    }
  });
});

