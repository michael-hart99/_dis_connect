export const HOST = 'www.thejobdance.com';

export const PORT = 6767;

export const PATH_TO_SSL = '/etc/letsencrypt/live/www.thejobdance.com/';

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
