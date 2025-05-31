export interface BottSpace {
  id: string;
  name: string;
  description?: string;
  channels?: BottChannel[];
}

export interface BottChannel {
  id: string;
  name: string;
  space: BottSpace;
  description?: string;
  // config?: {
  //   isQuiet: boolean;
  // };
}

export interface BottUser {
  id: string;
  name: string;
}

export enum BottAssetType {
  MP4 = "video/mp4",
  JPEG = "image/jpeg",
  MD = "text/markdown",
  MP3 = "audio/mp3",
}

type AnyObject = Record<string, unknown>;

export interface BottAsset {
  id: string;
  type: BottAssetType;
  data: Uint8Array;
  path: string;
  // Just BottEvents for now.
  parent?: BottEvent<AnyObject>;
}

export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
  FUNCTION_REQUEST = "request",
  FUNCTION_RESPONSE = "response",
}

export interface BottEvent<
  D extends AnyObject = { content: string },
> {
  id: string;
  type: BottEventType;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent<AnyObject>;
  user?: BottUser;
  assets?: BottAsset[];
}

export type AnyBottEvent = BottEvent<AnyObject>;
