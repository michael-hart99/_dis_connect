'use strict';

import { ServerManager, ServerMessage } from '../ServerManager.ts';
import WebRTCTools from '../WebRTCTools.ts';

/////////////////////////
//  SIGNALLING SERVER  //
/////////////////////////

const SM = new ServerManager('controller');

//////////////
//  WebRTC  //
//////////////

var pc: RTCPeerConnection;

async function initConn(): Promise<void> {
  pc = WebRTCTools.createPeerConn(SM, 'projector');

  await WebRTCTools.startStream(pc, 'vid');

  WebRTCTools.sendOffer(SM, pc, 'projector');
}

function processCandidate(json: ServerMessage): void {
  WebRTCTools.receiveCandidate(pc, json);
}

function processAnswer(json: ServerMessage): void {
  WebRTCTools.receiveAnswer(pc, json);
}

///////////////////////////////

function processDisconnect(): void {
  const video = document.getElementById('vid');
  if (
    video instanceof HTMLVideoElement &&
    video.srcObject instanceof MediaStream
  ) {
    video.hidden = true;
    video.srcObject.getTracks()[0].stop();
    SM.sendSignal('projector', 'disconnect', null);
  }
}

function beginVid(): void {
  SM.sendSignal('all', 'begin_video', null);
}

function resetVid(): void {
  SM.sendSignal('all', 'reset_video', null);
}

function blackout(): void {
  SM.sendSignal('all', 'blackout', null);
}

function multiStream(): void {
  SM.sendSignal('all', 'can_stream', null);
}

/////////////////

SM.addHandler('candidate', processCandidate);
SM.addHandler('answer', processAnswer);

//////////////////////////

(document
  .querySelector('#run') as HTMLButtonElement)
  .addEventListener('click', initConn);
(document
  .querySelector('#disconnect') as HTMLButtonElement)
  .addEventListener('click', processDisconnect);
(document
  .querySelector('#begin_vid') as HTMLButtonElement)
  .addEventListener('click', beginVid);
(document
  .querySelector('#reset_vid') as HTMLButtonElement)
  .addEventListener('click', resetVid);
(document
  .querySelector('#blackout') as HTMLButtonElement)
  .addEventListener('click', blackout);
(document
  .querySelector('#multi_stream') as HTMLButtonElement)
  .addEventListener('click', multiStream);
