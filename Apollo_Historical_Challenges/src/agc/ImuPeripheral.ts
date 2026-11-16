/** Ideal coarse-alignment servo and encoder loop. Never reads operator targets.
 * yaAGC BurstOutput emits drive counts on 0174–0176; LM131R1 COARS1
 * scales the encoder difference down by four. Return four fast CDU pulses
 * per drive count through the documented unprogrammed-counter interface.
 * Sources: yaAGC agc_engine.c BurstOutput/PushCduFifo; LM131R1
 * IMU_MODE_SWITCHING_ROUTINES.agc COARS1/SENDPULS.
 */
export class ImuPeripheral {
  private readonly pending = [0, 0, 0];
  readonly driveCounts = [0, 0, 0];
  applyOutput(channel: number, value: number): void {
    if (channel < 0o174 || channel > 0o176) return;
    const axis = channel - 0o174;
    const delta = (value & 0o37777) * (value & 0o40000 ? -1 : 1);
    this.driveCounts[axis] += delta;
    this.pending[axis] += delta * 4;
  }
  flush(write: (channel: number, value: number) => number): void {
    // At most 90 packets per 1000 CPU cycles; stay below the ring capacity.
    for (let axis = 0; axis < 3; axis++) {
      const direction = Math.sign(this.pending[axis]);
      for (let count = Math.min(30, Math.abs(this.pending[axis])); count > 0; count--) {
        if (write(0x80 | (0o32 + axis), direction > 0 ? 0o21 : 0o23) <= 0) break;
        this.pending[axis] -= direction;
      }
    }
  }
}
