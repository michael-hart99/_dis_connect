import ServerManager from './ServerManager';

/**
 * TODO
 */
interface ServerMessage {
  to: string;
  from: string;
  action: string;
  data: any;
}

class WebRTCTools {
  /**
   * Creates and returns a new peer connection. Uses the given
   *     server connection to send candidate information to the
   *     specified recipient.
   *
   * @param {ServerManager} The server that should be used to send info
   *     about new ICE candidates.
   * @param {String}        The ID of the peer that this connection is
   *     connecting to.
   *
   * @return {RTCPeerConnection} The newly prepared peer connection.
   */
  public static createPeerConn(
    SM: ServerManager,
    to: string
  ): RTCPeerConnection {
    let peerConn = new RTCPeerConnection();

    peerConn.onicecandidate = (e: RTCPeerConnectionIceEvent): void => {
      if (peerConn && e && e.candidate) {
        var candidate = e.candidate;
        SM.sendSignal(to, 'candidate', candidate);
        console.log('ICE sent');
      }
    };

    return peerConn;
  }

  /**
   * Attempts to get video from the user's camera and adds it to the
   *     given peer connection. Additionally places the video in the
   *     local webpage using the specified element's ID.
   *
   * @param {RTCPeerConnection} peerConn The connection that this
   *     camera's video will be attached to.
   * @param {String}            videoID  The ID of the element that this
   *     camera's video will stream to.
   */
  public static async startStream(
    peerConn: RTCPeerConnection,
    videoID: string
  ): Promise<void> {
    const video = document.getElementById(videoID) as HTMLVideoElement;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: false,
    });

    if (video !== null) {
      video.srcObject = stream;
      video.hidden = false;
    } else {
      console.log('Could not access element with id %s', videoID);
    }
    peerConn.addTrack(stream.getVideoTracks()[0], stream);
  }

  /**
   * Applies received candidate information to the given connection.
   *
   * @param {RTCPeerConnection} peerConn The connection that this candidate
   *     should be added to.
   * @param {Object}            json     Information about the received
   *     signal including candidate information.
   */
  public static receiveCandidate(
    peerConn: RTCPeerConnection,
    json: ServerMessage
  ): void {
    try {
      peerConn.addIceCandidate(new RTCIceCandidate(json.data));
    } catch (e) {}
  }

  /**
   * Creates an offer and sends it to the specified peer.
   *
   * @param {ServerManager}     SM       The server to be used to send
   *     connection info through.
   * @param {RTCPeerConnection} peerConn The peer the offer will be sent to.
   * @param {String}            to       The ID of the other peer in the
   *     connection.
   */
  public static sendOffer(
    SM: ServerManager,
    peerConn: RTCPeerConnection,
    to: string
  ): void {
    const sdpConstraints = {
      offerToReceiveAudio: false,
      offerToReceiveVideo: true,
    };
    peerConn.createOffer(sdpConstraints).then(
      (sdp: RTCSessionDescriptionInit): void => {
        peerConn.setLocalDescription(sdp);
        SM.sendSignal(to, 'offer', sdp);
        console.log('offer sent');
      }
    );
  }

  /**
   * Takes a given offer and creates an answer to be sent to the given peer.
   *
   * @param {ServerManager}     SM       The server to be used to send
   *     connection info through.
   * @param {RTCPeerConnection} peerConn The peer the offer will be sent to.
   * @param {Object}            json     Information about the received
   *     signal, including offer information.
   */
  public static receiveOffer(
    SM: ServerManager,
    peerConn: RTCPeerConnection,
    json: ServerMessage
  ): void {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    const sdpConstraints = {
      offerToReceiveAudio: false,
      offerToReceiveVideo: true,
    };
    peerConn.createAnswer(sdpConstraints).then(
      (sdp: RTCSessionDescriptionInit): void => {
        peerConn.setLocalDescription(sdp).then(
          (): void => {
            SM.sendSignal(json.from, 'answer', sdp);
            console.log('answer sent');
          }
        );
      }
    );
  }

  /**
   * Takes an answer and completes the RTC connection.
   *
   * @param {RTCPeerConnection} peerConn The peer that is receiving the
   *     answer.
   * @param {Object}            json     Information about the received
   *     signal, including answer information.
   */
  public static receiveAnswer(
    peerConn: RTCPeerConnection,
    json: ServerMessage
  ): void {
    peerConn.setRemoteDescription(new RTCSessionDescription(json.data));
    console.log('processed answer');
  }
}

export default WebRTCTools;
