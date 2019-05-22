export interface StateInfo {
  state: string;
  originTime: number | null;
}
export type PacketData =
  | number
  | StateInfo
  | RTCIceCandidateInit
  | RTCSessionDescriptionInit
  | null;

export interface ServerMessage {
  from: string;
  to: string;
  action: string;
  data: PacketData;
}
