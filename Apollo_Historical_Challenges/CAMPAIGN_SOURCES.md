# Apollo 13 campaign: source and model boundary

The campaign replaces the visible endurance/drill catalog. There is one training
sortie, then eight distinct events. The retired drills remain in source and their
tests as regression fixtures; they are not entries in the campaign menu.

## Primary material

- [Apollo 13 activation checklist](https://apollojournals.org/afj/ap13fj/pdf-hr/77-a13-activation-checklist.pdf#page=48), PDF 48, ACT 30. The scanned worksheet was rendered and visually inspected. The page is sideways in the original PDF.
- [Apollo 13 G&N dictionary](https://www.ibiblio.org/apollo/Documents/76-a13-g+n-dictionary.pdf#page=75), PDF 75, PGNS-54. The V41 N20 procedure and resolution were visually inspected.
- [NASA Apollo 13 mission report](https://sma.nasa.gov/SignificantIncidents/assets/apollo-13-mission-report.pdf), table 6.4-I, maneuver durations and actual/desired velocity changes.
- [NASA event timeline](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_13h_Timeline.htm), event epochs.
- [NASA original commentary transcript](https://archive.org/download/Apollo13Audio/AS13_PAO_djvu.txt), local line locators below.
- LM131R1 original PINBALL noun tables and extended-verb routines. N33 is ignition time; N81 is DELVLVC; N20/N22 distinguish actual/desired angles.

## Event data

| Event | Source | Gameplay job |
| --- | --- | --- |
| 058:02 platform transfer | ACT 30; PAO 14230–14268 | Calculate the transformed angles from the reported CM angles and roll calibration; operate the real coarse-alignment routine; transmit a readback. |
| Free-return PAD | PAO 16609–16651 | N33 061:29:42.84; N81 −00213 / +00041 / −00312; verify signs and the corrected Y component. |
| Free-return firing | Mission report / NASA timeline | Actual ignition 061:29:43.49, duration 34.23 s; source profile 5 s at minimum then 40%. |
| Thermal control | PAO 17523–17534 | Monitor/read back the changing encoder counters, then establish controlled rates with RCS. The modeled +0.30°/s target and tolerances are game conditions, not a claimed verbatim historical instruction. |
| PC+2 attitude correction | PAO 23305–23350 | Correct R1 to +27210, not +27218; R2 +35570, R3 +33010. |
| PC+2 PAD | PAO 23802–23848 | N33 079:27:38.30; N81 +08330 / −00509 / −02139. Actual ignition in the mission report is 079:27:38.95. Do not conflate PAD and achieved times. |
| PC+2 firing | Mission report | 263.82 s; source throttle profile 5 s minimum, 21 s at 40%, remainder maximum. |
| Manual correction | PAO 36071–36120; mission report | Planned PAD time 105:30, permission to perform earlier; actual ignition 105:18:28. The 14-second manual cutoff is used, not the film's fictional 39-second firing. |

## Audio

The activation cue remains the user-reviewed original `414-AAA_TRACK-1.mp3`,
05:07:32–05:08:20. The phrase anchor is 05:07:40, PAO line 14230.

The reviewed cue is now bundled: `public/audio/aquarius-v41-n20.mp3`, a lossless
MP3-frame cut from source 18452.0098–18500.0229 seconds (48.0131 seconds).
Other radio prompts are written comms cards. Browser TTS was removed. No
performer is cloned. Additional original recordings still need phrase review.

## Additional events and cockpit presentation

- Battery 2: mission report §§6.2/14.2.3, false malfunction beginning 099:54.
  Acknowledgement silences the master signal without erasing the fault.
- Final RCS correction: [NASA 1970 chronology](https://www.nasa.gov/wp-content/uploads/2023/04/1970.pdf),
  MCC-7 at 137:40, 22.4-second LM RCS firing. Thrust, representative mass and
  starting drift are model assumptions, not recovered telemetry.
- Entry target: PAO 52235–52286; N61 latitude −21.66°, longitude −165.37°,
  lift-vector up. Manche72R3 P61–P67 documents HEADSUP −1 for lift up.
  The CM ROM itself handles the N61 load/readback. EI 142:40:46 and
  36211 ft/s are final-PAD source values.
- Docked geometry is an original CM-apex-to-LM-roof side elevation. The SM stays
  at the CM heat-shield end; the LM gear is stowed. Entry displays CM only.
- Alarm frequencies: [NASA TN D-7919, p.16](https://www.ibiblio.org/apollo/Documents/Apollo%20Experience%20Report%20Crew%20Station%20Integration.pdf),
  LM 3000 Hz, CM alternating 750/2000 Hz. Rumble is an illustrative reconstructed
  cabin effect. Rate, burn-overrun and G annunciator thresholds are game rules,
  not a claim to reproduce every original C&W circuit. There are no random alarms.
- Entry integrates spherical-Earth gravity, drag and lift; representative
  ballistic coefficient 400 kg/m² and L/D .3, with a coarse log-density table.
  [NASA Apollo Entry Vehicle](https://ntrs.nasa.gov/api/citations/19720013191/downloads/19720013191.pdf)
  describes the lifting capsule. This constant-coefficient model is not a
  validated Apollo aerodynamic/thermal model. Its 0°/90°/0° bank guide and 3-km
  chute transition are authored game guidance, not the flown P61–P67 law.
  Bank changes affect calculated G-load/range and can produce skip-out.

## Physical model

RCS torque changes angular rates; coasting preserves those rates. Encoder motion
is sent into the AGC counter interface. The DSKY therefore sees moving counters,
not display strings filled with target values. Coarse drive feedback remains the
existing ROM-output-to-encoder servo loop.

The model uses representative inertia, mass, RCS lever arms, DPS thrust and
specific impulse, with a reduced local attitude/velocity integration. It is not a
validated Apollo 13 rigid-body/structural model, ephemeris, native simulation
parity result, or entry-corridor predictor. Starting drift and the small actuator-
driven flex response are authored model conditions. There is no random needle
wiggle. Angular coupling and IMU/body-frame kinematics are simplified.

PAD values are genuinely loaded into the ROM through V25 and observed through
V06/V16. The campaign does not claim a restored historical P30/P40 execution:
engine controls use the local flight model. The debrief distinguishes observed
historical ΔV from modeled ΔV and a nominal-profile residual. A wrong entry is
retained, affects the onboard target/countdown/readback and mission assessment;
only actual thrust/control inputs change the physical model's motion.

Chapter gaps are explicit time jumps. Recorded mission epochs are not invented
physical deadlines. Assistance, control tolerances, score and emergency overrun
shutdown are game rules.
