# Technical notes: Pitlantern

This page explains briefly how the source code is organized and how to build it. The welcome and the first ideas for
changing the game are in `README.md`.

## How the project is organized

This is a MakeCode Arcade project written in TypeScript. `pxt.json` gives the project name `pitlantern`,
the palette with the 16 colors and all files in the order in which MakeCode reads them. `mkc.json` says which device
the game is built for: the Calliope mini 3 with GameKit (variant "n3").

The files of the game:

- `core.ts`: The rules of the shift: rooms, player, Brummi, lamp, whistle, menus and training.
- `render.ts`: Draws all pictures of the game as pixel art at the size of the screen (160 x 120).
- `cinema.ts`: The intro, with one shared timeline that leaves time for reading.
- `audio.ts`: Friendly music and quiet sounds of the mine; every voice fades out at the end.
- `main.ts`: Connects the keys and the screen of the device to the game and gives the sounds their time.

The game is split into three namespaces: `Night` (rules and pictures, spread over `core.ts` and `render.ts`),
`NightAudio` (music and sounds) and `Cinema` (the intro).

## How the game runs

1. `main.ts` sets up the sound (`NightAudio.init`) and connects the menu button to `Night.pause`.
2. The game starts in the mode `Mode.Intro`: the intro with the studio card of the Calliope Hacker.
   A or B jumps to the studio card; a second press opens the title menu.
3. Then come the title menu (`Mode.Title`), the offer of the training (`Mode.TutorialChoice`) and the training in
   13 steps (`Mode.Tutorial`).
4. In every pass `main.ts` calls `Night.update` with the time that has passed and the keys that are pressed.
   In the mode `Mode.Play` the rules run there: moving the player, lamp, whistle, Brummi (`updateBrummi`), fuses.
5. `Night.render` paints every picture anew: the room, the darkness with the beam of light, Brummi, the dashboard and,
   depending on the mode, the title, the training, the pause menu or the result.
6. `NightAudio.update` plays the sounds that the rules ordered with `sound`.

The mine has 12 rooms with 20 × 15 tiles each, and every tile is 8 × 8 pixels. Every tile is a number: 0 floor, 1 wall,
2 metal and 3 water. The positions of the rooms are in `RX` and `RY`, their names in `NAMES`.

## Building

- **In the browser:** Open arcade.makecode.com, choose "Import" and open the game file `pitlantern.hex`. The whole
  source code is inside the game file. The simulator shows the game right away.
- **On your computer:** With the command line tool of MakeCode (npm package `makecode`) run `makecode build` in this
  folder. Afterwards the game file for the device is in `built/n3/binary.hex`.

## Putting it on the device

Plug the Calliope mini 3 into the computer with the USB cable. It shows up as a drive. Drag the game file (`.hex`)
onto this drive; then the game starts by itself. The screen of the GameKit has 160 × 120 pixels and 16 colors.
This game does not save anything.

This game also exists in German, French and Spanish. All four versions are made from the same original project.
