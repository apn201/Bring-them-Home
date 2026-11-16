/**
 * A source-checked time conversion for Archive.org's 405-AAA track 1.
 *
 * The recording is PAO commentary, not the Apollo 13 technical air-to-ground
 * loop. It may only be used for reviewed commentary cues.  The paired evidence
 * file records the two human-verified anchors and deliberately stays out of
 * the public runtime bundle until a cue has been checked against its text.
 */
export const PAO_LAUNCH_RECORDING_SECONDS = 1 * 3_600 + 31 * 60 + 7;

export interface PaoTimelinePoint {
  recordingSeconds: number;
  getSeconds: number;
}

export function recordingToGetSeconds(recordingSeconds: number): number {
  return recordingSeconds - PAO_LAUNCH_RECORDING_SECONDS;
}

export function getToRecordingSeconds(getSeconds: number): number {
  return getSeconds + PAO_LAUNCH_RECORDING_SECONDS;
}

export function recordingToPaoPoint(recordingSeconds: number): PaoTimelinePoint {
  return { recordingSeconds, getSeconds: recordingToGetSeconds(recordingSeconds) };
}

export function formatSignedGet(getSeconds: number): string {
  const sign = getSeconds < 0 ? 'T−' : 'T+';
  const absolute = Math.abs(Math.round(getSeconds));
  const hours = Math.floor(absolute / 3_600).toString().padStart(2, '0');
  const minutes = Math.floor((absolute % 3_600) / 60).toString().padStart(2, '0');
  const seconds = (absolute % 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}:${seconds}`;
}
