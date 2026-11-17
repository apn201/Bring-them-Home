# Apollo 13: a MicroProse-style design review

An imagined studio critique, written for this project. These are not quotations
from Sid Meier or claims that he reviewed the game.

## The designer's notes

"You have built a working instrument. Where is the player's problem?"

The previous menu offered eleven variations of the same task. More keystrokes
made an exercise longer without creating a new decision. Training kept expanding
while the emergency, spacecraft and mission remained largely stationary.

"Don't score the number of buttons. Score what the player accomplished."

Success must mean an alignment was established, a readback was correct, unwanted
rotation was arrested, or a burn was performed with an acceptable residual.
Typing a plausible string must not tick a box before the computer responds.

"The best difficulty comes from the situation changing."

Teach once. Then change the job: preserve a reference before powerdown; copy a
corrected maneuver PAD; control a slowly rotating docked stack; prepare the
large PC+2 burn; perform a brief correction using a timer and attitude reference.
Do not put two copies of the same alignment task next to one another.

"Give information a place in the world."

Sometimes Houston supplies numbers. Sometimes the player must consult the actual
flight-manual scan. Sometimes the panel is the only source and the player must
read it back. The mission screen should state the immediate problem; the flight
bag, radio and instruments provide the information needed to solve it.

"A spacecraft is not a static icon."

Coasting preserves angular momentum. RCS pulses change angular velocity and use
propellant. Counterthrust is needed to stop a turn. Engine thrust changes
velocity and mass. Instruments must reflect the same state fed back to the AGC.
Do not manufacture random sensor motion to decorate the display.

"Danger needs understandable consequences, not arbitrary punishment."

Show elapsed burn time, attitude rate, thrust, fuel used and velocity change.
Explain errors in English. A wrong PAD remains wrong until corrected; a wrong
burn changes the maneuver residual. Do not invent a fatal entry prediction from
a cartoon flight-path line.

## Campaign structure

One short training sortie, then chronological Apollo 13 events:

1. Instrument qualification: light test, one live readout and a transmitted report.
2. 058:02, preserve the platform: use ACT 30 and the reviewed crew-ground cue.
3. 061:29, free return: load ignition time and three velocity components, verify
   the PAD, then monitor the short DPS firing.
4. 062:50, thermal control: read changing angles, transmit a report, and control
   the stack's rates rather than entering another alignment target.
5. 079:27, PC+2: a corrected attitude/PAD, a long throttle sequence and a larger
   consequence for an incorrect load or timing.
6. 105:18, manual correction: preserve attitude and cut off a short burn on time.

Historical timestamps, PAD values and procedures are cited in campaign content.
Simplified dynamics, representative initial drift, time compression, assistance
and success tolerances are authored simulation rules, not newly discovered
historical telemetry. Distinguish an original recording from reproduced speech.

## Acceptance checks

- One visible training sortie; no repeated alignment endurance drills in campaign.
- Distinct instruction sources: direct briefing, flight-manual scan, radio, live readback.
- At least one time/PAD load, one correction, one rate-control task and one burn.
- Every computer task must observe the ROM response.
- The ship, rates, encoders, propellant and thrust must share one simulation state.
- A failed or inaccurate maneuver must produce a comprehensible debrief.
- Sources and model limits belong in the flight bag, not a wall of caveats over the controls.
