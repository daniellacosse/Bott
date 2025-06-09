export type AnyShape = Record<string, unknown>;

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

export enum BottInputFileType {
  MP4 = "video/mp4",
  JPEG = "image/jpeg",
  MD = "text/markdown",
  MP3 = "audio/mp3",
}

export interface BottInputFile {
  url: URL;
  data: Uint8Array;
  type: BottInputFileType;
  path: string;
  parent?: BottEvent<AnyShape>;
}

export enum BottOutputFileType {
  PNG = "image/png",
  MP4 = "video/mp4",
  WAV = "audio/wav",
  TXT = "text/plain",
}

export interface BottOutputFile {
  id: string;
  data: Uint8Array;
  type: BottOutputFileType;
  path: string;
  parent?: BottEvent<AnyShape>;
}

export enum BottEventType {
  MESSAGE = "message",
  REPLY = "reply",
  REACTION = "reaction",
  REQUEST = "request",
  RESPONSE = "response",
}

export interface BottEvent<
  D extends AnyShape = { content: string },
  T extends BottEventType = BottEventType,
  F extends BottInputFile[] | BottOutputFile[] =
    | BottInputFile[]
    | BottOutputFile[],
> {
  id: string;
  type: T;
  details: D;
  timestamp: Date;
  channel?: BottChannel;
  parent?: BottEvent<AnyShape>;
  user?: BottUser;
  files?: F;
}

export type AnyBottEvent = BottEvent<AnyShape>;

export type BottRequestEvent<O extends AnyShape> = BottEvent<
  { name: string; options: O },
  BottEventType.REQUEST,
  BottInputFile[]
>;

export enum BottRequestOptionType {
  STRING = "string",
  INTEGER = "integer",
  BOOLEAN = "boolean",
}

export type BottRequestOption = {
  name: string;
  type: BottRequestOptionType;
  description?: string;
  required?: boolean;
};

export type BottResponseEvent<D extends AnyShape = { content: string }> =
  BottEvent<
    D,
    BottEventType.RESPONSE,
    BottOutputFile[]
  >;

export type BottRequestHandler<
  O extends AnyShape,
  D extends AnyShape = { content: string },
> = {
  (
    request: BottRequestEvent<O>,
  ):
    | BottResponseEvent<D>
    | Promise<BottResponseEvent<D>>;
  description?: string;
  options?: BottRequestOption[];
};
