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
  startSeconds: 5 * 3_600 + 7 * 60 + 40,
  endSeconds: 5 * 3_600 + 7 * 60 + 56,
};

export function cueDurationSeconds(cue: TranscriptAudioCue): number {
  return Math.max(0, cue.endSeconds - cue.startSeconds);
}

/** Browser-only, operator-initiated playback of a reviewed transcript cue. */
export class TranscriptCuePlayer {
  private audio?: HTMLAudioElement;
  private finishTimer?: number;

  preview(cue: TranscriptAudioCue, onStatus: (message: string) => void): void {
    this.stop();
    const audio = new Audio(cue.sourceUrl);
    this.audio = audio;
    audio.preload = 'metadata';
    audio.addEventListener('error', () => onStatus('Archive audio could not be loaded. Check the network connection and retry.'), { once: true });
    audio.addEventListener('loadedmetadata', () => {
      audio.currentTime = cue.startSeconds;
      void audio.play().then(() => {
        onStatus(`Playing reviewed cue · ${formatCueSeconds(cue.startSeconds)}–${formatCueSeconds(cue.endSeconds)}`);
        this.finishTimer = window.setTimeout(() => { this.stop(); onStatus('Reviewed cue complete.'); }, cueDurationSeconds(cue) * 1_000);
      }).catch(() => onStatus('Playback was blocked by the browser. Press play again to retry.'));
    }, { once: true });
    audio.load();
    onStatus('Loading public-domain audio and seeking to the reviewed cue…');
  }

  stop(): void {
    if (this.finishTimer !== undefined) window.clearTimeout(this.finishTimer);
    this.finishTimer = undefined;
    if (!this.audio) return;
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
