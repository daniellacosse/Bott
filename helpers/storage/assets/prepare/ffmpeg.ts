// WIP

const _ffmpeg = async (
  args: string[],
  input: Uint8Array,
): Promise<Uint8Array> => {
  const process = new Deno.Command("ffmpeg", {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const stdinWriter = process.stdin.getWriter();
  await stdinWriter.write(input);
  await stdinWriter.close();

  const { success, code, stdout: result, stderr: error } = await process
    .output();

  if (!success) {
    throw new Error(
      `ffmpeg command failed with code "${code}".\nStderr:\n${
        new TextDecoder().decode(error)
      }`,
    );
  }

  return result;
};

type FileDataTransformer = (data: Uint8Array) => Promise<Uint8Array | null>;

// --- Compression Parameters ---
const MAX_DIMENSION = 240;

// Video specific
const VIDEO_TARGET_FPS = 10;
const VIDEO_H265_CRF = 35; // Constant Rate Factor for H.265 (higher means lower quality, smaller size. 23 is high quality, 35-40 is very compressed)
const VIDEO_AUDIO_BITRATE_K = 32; // Audio bitrate in kbps for video
const VIDEO_MAX_DURATION_S = 30; // Max duration for video in seconds

// Audio specific
const AUDIO_BITRATE_K = 48; // Audio bitrate in kbps for standalone audio
const AUDIO_SAMPLE_RATE_HZ = 22050; // Sample rate in Hz
const AUDIO_MAX_DURATION_S = 60; // Max duration for audio in seconds
// --- End Compression Parameters ---

export const preparePng: FileDataTransformer = (data) => {
  const args = [
    "-i",
    "pipe:0", // Input from stdin
    "-vf",
    `scale=${MAX_DIMENSION}:${MAX_DIMENSION}:force_original_aspect_ratio=decrease:sws_flags=lanczos`, // Scale down, fitting within MAX_DIMENSION box
    "-frames:v",
    "1", // Ensure only one frame for static PNG
    "-f",
    "png", // Output format
    "pipe:1", // Output to stdout
  ];
  return _ffmpeg(args, data);
};

export const prepareMp4: FileDataTransformer = (data) => {
  const args = [
    "-i",
    "pipe:0",
    "-c:v",
    "libx265", // H.265 video codec
    "-preset",
    "ultrafast", // Faster encoding, potentially larger file for same CRF but good for speed
    "-crf",
    `${VIDEO_H265_CRF}`, // Constant Rate Factor for quality/size
    "-vf",
    `scale=${MAX_DIMENSION}:${MAX_DIMENSION}:force_original_aspect_ratio=decrease:sws_flags=lanczos,fps=${VIDEO_TARGET_FPS}`, // Scale and reduce FPS
    "-c:a",
    "aac", // AAC audio codec
    "-b:a",
    `${VIDEO_AUDIO_BITRATE_K}k`, // Audio bitrate
    "-ar",
    `${AUDIO_SAMPLE_RATE_HZ}`, // Audio sample rate
    "-t",
    `${VIDEO_MAX_DURATION_S}`, // Cap duration
    "-movflags",
    "+frag_keyframe+empty_moov+faststart", // Optimize for streaming/web
    "-f",
    "mp4",
    "pipe:1",
  ];
  return _ffmpeg(args, data);
};

export const prepareWav: FileDataTransformer = (data) => {
  // This will convert WAV to a heavily compressed MP3
  const args = [
    "-i",
    "pipe:0",
    "-c:a",
    "libmp3lame", // MP3 audio codec
    "-b:a",
    `${AUDIO_BITRATE_K}k`, // Audio bitrate
    "-ar",
    `${AUDIO_SAMPLE_RATE_HZ}`, // Audio sample rate
    "-t",
    `${AUDIO_MAX_DURATION_S}`, // Cap duration
    "-f",
    "mp3",
    "pipe:1",
  ];
  return _ffmpeg(args, data);
};
