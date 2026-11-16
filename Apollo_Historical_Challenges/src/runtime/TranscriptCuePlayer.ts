export interface TranscriptAudioCue {
  id: string;
  sourceUrl: string;
  sourceLabel: string;
  transcriptLabel: string;
  startSeconds: number;
  endSeconds: number;
}

export const AQUARIUS_V41_N20_CUE: TranscriptAudioCue = {
  id: 'aquarius-v41-n20',
  sourceUrl: 'https://archive.org/download/Apollo13Audio/414-AAA_TRACK-1.mp3',
  sourceLabel: '414-AAA Track 1 · public-domain Archive.org transfer',
  transcriptLabel: 'AS13_PAO line 14230 · V41 N20 / +30243',
  // 8 seconds of lead-in before the phrase verified at 05:07:40, followed
  // by room for the first complete exchange instead of a clipped sentence.
  startSeconds: 5 * 3_600 + 7 * 60 + 32,
  endSeconds: 5 * 3_600 + 8 * 60 + 20,
};

export function cueDurationSeconds(cue: TranscriptAudioCue): number {
  return Math.max(0, cue.endSeconds - cue.startSeconds);
}

/** Browser-only, operator-initiated playback of a reviewed transcript cue. */
export class TranscriptCuePlayer {
  private audio?: HTMLAudioElement;
  private timeBoundary?: () => void;

  preview(cue: TranscriptAudioCue, onStatus: (message: string) => void): void {
    this.stop();
    const audio = new Audio(cue.sourceUrl);
    this.audio = audio;
    audio.preload = 'metadata';
    audio.addEventListener('error', () => onStatus('Archive audio could not be loaded. Check the network connection and retry.'), { once: true });
    audio.addEventListener('loadedmetadata', () => {
      const startPlayback = () => {
        this.timeBoundary = () => {
          if (audio.currentTime < cue.endSeconds) return;
          this.stop();
          onStatus('Reviewed cue complete.');
        };
        audio.addEventListener('timeupdate', this.timeBoundary);
        void audio.play().then(() => {
          onStatus(`Playing reviewed cue · ${formatCueSeconds(cue.startSeconds)}–${formatCueSeconds(cue.endSeconds)}`);
        }).catch(() => onStatus('Playback was blocked by the browser. Press play again to retry.'));
      };
      audio.addEventListener('seeked', startPlayback, { once: true });
      audio.currentTime = cue.startSeconds;
    }, { once: true });
    audio.load();
    onStatus('Loading public-domain audio and seeking to the reviewed cue…');
  }

  stop(): void {
    if (!this.audio) return;
    if (this.timeBoundary) this.audio.removeEventListener('timeupdate', this.timeBoundary);
    this.timeBoundary = undefined;
    this.audio.pause();
    this.audio.src = '';
    this.audio = undefined;
  }
}

export function formatCueSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3_600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
