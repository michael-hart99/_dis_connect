'use strict';

import { ServerMessage } from '../../server/ServerInfo';
import { ServerManager } from '../ServerManager';
import { WebRTCTools } from '../WebRTCTools';

// The server connection that will send/receive messages
const SM = new ServerManager('controller');

// The RTC connection with the projector
var pc: RTCPeerConnection;

/**
 * Initializes a PeerConnection and opens the camera's video stream.
 */
async function initConn(): Promise<void> {
  pc = WebRTCTools.createPeerConn(SM, 'projector');

  await WebRTCTools.startStream(pc, 'vid');

  WebRTCTools.sendOffer(SM, pc, 'projector');
}

/**
 * Updates the RTC connection with the given ICE candidate information.
 *
 * @param {ServerMessage} json A message with ICE candidate information.
 */
function processCandidate(json: ServerMessage): void {
  WebRTCTools.receiveCandidate(pc, json);
}

/**
 * Updates the RTC connection with the given offer details.
 *
 * @param {ServerMessage} json A message with peer session description information.
 */
function processAnswer(json: ServerMessage): void {
  WebRTCTools.receiveAnswer(pc, json);
}

/**
 * Drops the connection with the projector and updates the webpage visually to
 *     reflect that.
 */
function processDisconnect(): void {
  const video = document.getElementById('vid') as HTMLVideoElement;
  const src = video.srcObject as MediaStream;

  video.hidden = true;
  src.getTracks()[0].stop();
  SM.sendSignal('projector', 'disconnect', null);
}

/**
 * Send message to begin the embedded video.
 */
function beginVid(): void {
  SM.sendSignal('all', 'beginVideo', null);
}

/**
 * Send message to restart the embedded video.
 */
function resetVid(): void {
  SM.sendSignal('all', 'resetVideo', null);
}

/**
 * Send message to blackout the webpage.
 */
function blackout(): void {
  SM.sendSignal('all', 'blackout', null);
}

/**
 * Send message to enable streaming.
 */
function canStream(): void {
  SM.sendSignal('all', 'canStream', null);
}

////////////////////////////

// Add action handlers to run when messages are received
SM.addHandler('candidate', processCandidate);
SM.addHandler('answer', processAnswer);

// Add event to the HTML buttons
(document.querySelector('#run') as HTMLButtonElement).addEventListener(
  'click',
  initConn
);
(document.querySelector('#disconnect') as HTMLButtonElement).addEventListener(
  'click',
  processDisconnect
);
(document.querySelector('#begin_vid') as HTMLButtonElement).addEventListener(
  'click',
  beginVid
);
(document.querySelector('#reset_vid') as HTMLButtonElement).addEventListener(
  'click',
  resetVid
);
(document.querySelector('#blackout') as HTMLButtonElement).addEventListener(
  'click',
  blackout
);
(document.querySelector('#multi_stream') as HTMLButtonElement).addEventListener(
  'click',
  canStream
);
