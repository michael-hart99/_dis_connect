'use strict';

import { ServerMessage } from '../../server/ServerInfo';
import { ServerManager } from '../ServerManager';
import { WebRTCTools } from '../WebRTCTools';

// The server connection that will send/receive messages
const SM = new ServerManager('projector');

// The RTC connection with the controller
var pc: RTCPeerConnection;

/**
 * Initializes a PeerConnection.
 *
 * @returns {RTCPeerConnection} A new connection with the controller.
 */
function initConn(): RTCPeerConnection {
  let peerConn = WebRTCTools.createPeerConn(SM, 'controller');

  const video = document.querySelector('#vid') as HTMLVideoElement;
  peerConn.ontrack = (e: RTCTrackEvent): void => {
    console.log('stream received');
    video.srcObject = e.streams[0];
  };

  return peerConn;
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
function processOffer(json: ServerMessage): void {
  pc = initConn();

  WebRTCTools.receiveOffer(SM, pc, json);
}

////////////////////////

/**
 * Drops the connection with the controller and updates the webpage visually to
 *     reflect that.
 */
function processDisconnect(): void {
  const video = document.querySelector('#vid') as HTMLVideoElement;
  const src = video.srcObject as MediaStream | null;

  if (src !== null) {
    src.getTracks()[0].stop();
    video.srcObject = null;
  }
}

/////////////////////////

// Add action handlers to run when messages are received
SM.addHandler('candidate', processCandidate);
SM.addHandler('offer', processOffer);
SM.addHandler('disconnect', processDisconnect);
