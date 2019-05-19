'use strict';

import { ServerManager, ServerMessage } from '../ServerManager.ts';
import WebRTCTools from '../WebRTCTools.ts';

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager("preshow");

SM.addHandler(  "candidate", processCandidate);
SM.addHandler(     "answer", processAnswer);
SM.addHandler( "initialize", processInitialize);
SM.addHandler(   "blackout", processBlackout);
SM.addHandler("begin_video", processBeginVideo);
SM.addHandler( "can_stream", processCanStream);

//////////////
//  WebRTC  //
//////////////

var pc: RTCPeerConnection;

async function initConn(): Promise<void> {
  const button = document.querySelector('#stream-button') as HTMLDivElement;
  button.hidden = true;

  pc = WebRTCTools.createPeerConn(SM, "streamHost");

  await WebRTCTools.startStream(pc, "stream");

  WebRTCTools.sendOffer(SM, pc, "streamHost");
}

function processCandidate(json: ServerMessage): void {
  WebRTCTools.receiveCandidate(pc, json);
}

function processAnswer(json: ServerMessage): void {
  WebRTCTools.receiveAnswer(pc, json);
}

///////////////////////////////

function processBlackout(): void {
  const preshow = document.querySelector('#preshow-vid') as HTMLVideoElement;
  const button = document.querySelector('#stream-button') as HTMLDivElement;
  const stream = document.querySelector('#stream') as HTMLVideoElement;

  preshow.hidden = true;
  preshow.pause();
  button.hidden = true;
  stream.hidden = true;

  SM.sendSignal("streamHost", "disconnect", null);

  if (stream.srcObject instanceof MediaStream) {
    stream.srcObject.getVideoTracks()[0].stop();
  }
  stream.srcObject = null;
}

function processBeginVideo(json: ServerMessage): void {
  const preshow = document.querySelector('#preshow-vid') as HTMLVideoElement;
  preshow.oncanplay = () => {
    preshow.oncanplay = null;
    preshow.play();
    preshow.currentTime = (Date.now() - Number(json.data)) / 1000.0;
    preshow.hidden = false;
  }
  preshow.load();
}

function processInitialize(json: ServerMessage): void {
  let details = json.data.split('|');
  SM.setID(details[0]);

  switch (details[1]) {
    case "idle":
      break;
    case "begin_video":
      json.data = details[2];
      processBeginVideo(json);
      break;
    case "blackout":
      processBlackout();
      break;
    case "can_stream":
      processCanStream();
      break;
    default:
      console.log("Unexpected initialize state: %s", details[1]);
  }
}

function processCanStream(): void {
  processBlackout();

  const button = document.querySelector('#stream-button') as HTMLDivElement;
  button.hidden = false;
}

(document
  .querySelector('#stream-button') as HTMLDivElement)
  .addEventListener('click', initConn);
