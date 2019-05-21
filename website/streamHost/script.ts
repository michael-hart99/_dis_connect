'use strict';

import { ServerMessage } from '../../server/ServerInfo';
import { ServerManager } from '../ServerManager';
import { WebRTCTools } from '../WebRTCTools';

/**
 * Pairs a Peer Connection with the camera feed that will be streamed.
 *     If this stream is not currently being displayed, inUseIndex == -1.
 */
interface StreamConn {
  peerConn: RTCPeerConnection;
  stream: MediaStream;
  inUseIndex: number;
}

// The server connection that will send/receive messages
const SM = new ServerManager('streamHost');

// Maps unique connection IDs to RTC data and the video streams
var conns: Map<number, StreamConn> = new Map();

// Represents the current state of the webpage's grid of 9 videos.
//     Values >=0 represent video squares that are in-use.
var inUse = [-1, -1, -1, -1, -1, -1, -1, -1, -1];
console.log(inUse);

// The minimum delay between flickers (in seconds)
const MIN_FLICKER_DELAY = 5;
// The maximum delay between flickers (in seconds)
const MAX_FLICKER_DELAY = 15;

/**
 * Choses random streams to replace the currently visible live feeds. This
 *     algorithm will choose first from any stream and place it in a random
 *     video element. Then, if that stream had already been visible, the
 *     previous location of the stream will be overwritten with a stream that
 *     was not on-screen.
 *
 * This choice was made to stop the viewer from only
 *     watching one stream since they're constantly in-motion, and also to
 *     make streams that aren't visible likely to become visible.
 *
 * This function will call itself again after a few seconds.
 */
function flicker(): void {
  if (conns.size > 9) {
    let streamKeys = Array.from(conns.keys());

    // Chose a random stream and location to place it
    let chosenKey = Math.floor(Math.random() * conns.size);
    let chosenStreamID = streamKeys[chosenKey];
    let chosenConn = conns.get(chosenStreamID);
    let chosenVideo = Math.floor(Math.random() * 9);

    if (chosenConn) {
      // The ID of the stream being replaced
      let prevStreamID = inUse[chosenConn.inUseIndex];

      // If this stream was already on-screen, choose one from off-screen to
      // take its previous spot
      if (inUse.includes(chosenStreamID)) {
        let notInUse = streamKeys.filter((x): boolean => !inUse.includes(x));

        let chosenUnusedKey = Math.floor(Math.random() * notInUse.length);
        let chosenUnusedStreamID = notInUse[chosenUnusedKey];
        let chosenUnusedConn = conns.get(chosenUnusedStreamID);

        if (chosenUnusedConn) {
          let video = document.querySelector(
            '#stream' + (chosenConn.inUseIndex + 1)
          ) as HTMLVideoElement;

          video.srcObject = chosenUnusedConn.stream;
          inUse[chosenConn.inUseIndex] = chosenUnusedStreamID;
          chosenUnusedConn.inUseIndex = chosenConn.inUseIndex;
        }
      }

      // Place the chosen stream in the chosen position
      let video = document.querySelector(
        '#stream' + (chosenVideo + 1)
      ) as HTMLVideoElement;
      video.srcObject = chosenConn.stream;
      inUse[chosenVideo] = chosenStreamID;
      chosenConn.inUseIndex = chosenVideo;

      if (prevStreamID !== -1) {
        let prevConn = conns.get(prevStreamID);
        if (prevConn) {
          prevConn.inUseIndex = -1;
        }
      }

      console.log('flickered');
    }
  }

  setTimeout(
    flicker,
    Math.random() * ((MAX_FLICKER_DELAY - MIN_FLICKER_DELAY) * 1000) +
      MIN_FLICKER_DELAY * 1000
  );
}

/**
 * Initializes a PeerConnection and prepares to receive media.
 *
 * @param {string} from The ID of the peer to connect with.
 *
 * @returns {RTCPeerConnection} A new connection with the specified peer.
 */
function initConn(from: string): RTCPeerConnection {
  let peerConn = WebRTCTools.createPeerConn(SM, from);
  let fromAsNum = Number(from);

  let video = document.querySelector(
    '#stream' + ((fromAsNum % 9) + 1)
  ) as HTMLVideoElement;
  // Update video element with live stream once connection is established
  peerConn.ontrack = (e: RTCTrackEvent): void => {
    console.log('stream received');
    let useIndex = fromAsNum % 9;
    video.srcObject = e.streams[0];
    conns.set(fromAsNum, {
      peerConn: peerConn,
      stream: e.streams[0],
      inUseIndex: useIndex,
    });
    if (inUse[useIndex] !== -1) {
      let prevStream = conns.get(inUse[useIndex]);
      if (prevStream) {
        prevStream.inUseIndex = -1;
      }
    }
    inUse[useIndex] = fromAsNum;
  };

  return peerConn;
}

/**
 * Updates the corresponding peer connection with the given ICE candidate
 *     information.
 *
 * @param {ServerMessage} json A message with ICE candidate information.
 */
function processCandidate(json: ServerMessage): void {
  let conn = conns.get(Number(json.from));
  if (conn) {
    WebRTCTools.receiveCandidate(conn.peerConn, json);
  }
}

/**
 * Updates the corresponding peer connection with the given offer details.
 *
 * @param {ServerMessage} json A message with peer session description information.
 */
function processOffer(json: ServerMessage): void {
  let peerConn = initConn(json.from);

  WebRTCTools.receiveOffer(SM, peerConn, json);
}

/**
 * Drops the given connection and updates the webpage visually to reflect
 *     that.
 *
 * @param {ServerMessage} json A message detailing who disconnected.
 */
function processDisconnect(json: ServerMessage): void {
  const thisConn = conns.get(Number(json.from));
  if (thisConn) {
    const video = document.querySelector(
      '#stream' + (thisConn.inUseIndex + 1)
    ) as HTMLVideoElement;
    const src = video.srcObject as MediaStream | null;
    if (src !== null) {
      src.getTracks()[0].stop();
      video.srcObject = null;
      inUse[thisConn.inUseIndex] = -1;
    }
    conns.delete(Number(json.from));
  }
}

///////////////

// Add action handlers to run when messages are received
SM.addHandler('candidate', processCandidate);
SM.addHandler('offer', processOffer);
SM.addHandler('disconnect', processDisconnect);

// Start flickering the live feeds
flicker();
