# Pitlantern

Hi! This is **Pitlantern**, a game by **Calliope Hacker** for the **Calliope mini 3 with GameKit**.

It is night in the mine. The power is out, and all you have is your helmet lamp. Find five fuses, put them into the
generator and ride the lift up. Watch your lamp: when the battery is empty, the shift is over. Brummi, the little
maintenance robot, loves to tidy up: whenever he reaches you, he takes one fuse from you and carries it back to its
place. The Calliope Hacker built him and sits at a desk in the control room up top.

## How to play

- **D-pad:** walk
- **A + direction:** run (that is loud)
- **A:** pick up a fuse or a battery, step into a locker and back out
- **Hold A at the generator:** insert a fuse
- **B (short press):** light on and off
- **Hold B:** whistle; if Brummi is near, he stops for a moment and listens
- **Menu:** pause

## Change the game yourself

The whole source code is inside this game file. Open it in MakeCode Arcade (arcade.makecode.com, "Import").
Change a number, start the simulator and see what happens:

- **Make the lamp last longer:** In `core.ts` you find `DRAIN_BEAM = 0.30`. That is the percent per second
  used while the light is on. Try `0.1`.
- **Make Brummi faster:** In `core.ts` you find `FOLLOW_SPEED = 64`. That is the number of pixels per second
  while Brummi drives after you. With `90` you have to run.
- **Whistle more often:** In `core.ts` you find `WHISTLE_COOLDOWN_MS = 6000`. That is the wait between
  two whistles in milliseconds. Try `1000`.

You can read an explanation of the source code for kids, parents and teachers on calliope-hacker.de.
