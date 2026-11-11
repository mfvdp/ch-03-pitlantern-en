// Draws all pictures of the game as pixel art at the size of the screen (160 x 120). No new image is ever created while
// drawing: the two full-screen images (mask, backdrop) are created only once, at the start.
namespace Night {
    // The small font font8 comes with MakeCode Arcade. Each character is six pixels wide.
    let smallFont = image.font8
    let mask = image.create(160,120)
    let maskTimeMs = -999
    let maskX = -100
    let maskY = -100
    let maskRoom = -1
    let maskDirection = 99
    let maskLight = false
    let maskHidden = -2
    let backdrop = image.create(160,120)
    let backdropRoom = -1
    let backdropSeed = -1
    // The name of the game is drawn with the big 5 x 7 letters from cinema.ts (Cinema.bigLetter) and is always
    // centered. It fits into the frame up to 12 letters; the font knows all the characters in alphabet.
    export const GAME_NAME = "PITLANTERN"
    function logo(y: number, reveal: number) {
        let n=GAME_NAME.length,x0=Math.floor((160-(n*12-2))/2)
        for(let i=0;i<Math.min(n,reveal);i++) {
            Cinema.bigLetter(GAME_NAME.charAt(i),x0+1+i*12,y+2,2,6)
            Cinema.bigLetter(GAME_NAME.charAt(i),x0+i*12,y,2,1)
            if(GAME_NAME.charAt(i)!=" ")screen.setPixel(x0+2+i*12,y+3,12)
        }
        screen.drawLine(x0+6,y+19,x0+n*12-9,y+19,10)
        screen.fillRect(69,y+18,22,3,5)
    }
    function text(value: string,x: number,y: number,color: number) {
        screen.print(value,x,y,color,smallFont)
    }
    function centered(value: string,y: number,color: number) {
        text(value,Math.floor((160-value.length*6)/2),y,color)
    }
    // Small pictures instead of letters, at most 7 pixels high: fuse 7 x 5, bag 7 x 7, whistle 8 x 6, door 5 x 7 and
    // generator socket 9 x 7. A fuse as it lies in the mine: brown caps, yellow body, white middle.
    function fuseIcon(x: number,y: number) {
        screen.fillRect(x,y+1,7,5,13);screen.fillRect(x+1,y+2,5,3,5);screen.drawLine(x+3,y+1,x+3,y+5,1)
    }
    // A fuse in the generator (inserted): gray socket, dark slot, yellow fuse, turquoise light.
    function installedIcon(x: number,y: number) {
        screen.fillRect(x,y,9,7,10);screen.fillRect(x+1,y+1,7,5,14)
        screen.fillRect(x+2,y+2,5,3,5);screen.setPixel(x+4,y+3,1);screen.setPixel(x+7,y+1,9)
    }
    // The bag (carried fuses): a handle and a light bag with a flap.
    function bagIcon(x: number,y: number) {
        screen.drawLine(x+2,y,x+4,y,12);screen.setPixel(x+1,y+1,12);screen.setPixel(x+5,y+1,12)
        screen.fillRect(x,y+2,7,5,12);screen.drawLine(x+1,y+3,x+5,y+3,13)
    }
    // The whistle (time until it is ready again): a mouthpiece and a round body with a hole.
    function whistleIcon(x: number,y: number) {
        screen.fillRect(x,y+2,3,2,12);screen.fillCircle(x+5,y+3,2,12)
        screen.setPixel(x+5,y+3,15);screen.setPixel(x+7,y,10)
    }
    // A door (the way out at the lift): frame and knob.
    function doorIcon(x: number,y: number,color: number) {
        screen.drawRect(x,y,5,7,color);screen.setPixel(x+3,y+4,color)
    }
    function bars(size: number) {
        screen.fillRect(0,0,160,size,15)
        screen.fillRect(0,120-size,160,size,15)
    }
    function rain(sceneMs: number,count: number) {
        for(let i=0;i<count;i++) {
            let x=(i*29+Math.floor(sceneMs/60))%178-9,y=(i*47+Math.floor(sceneMs/(i%3+5)))%130-8
            screen.drawLine(x,y,x-3,y+7,i%4==0?10:8)
        }
    }
    function skyline(sceneMs: number) {
        screen.fill(11)
        screen.fillCircle(123,30,14,8);screen.fillCircle(127,26,14,11)
        for(let i=0;i<8;i++) {
            let x=i*24-12,h=12+(i*19)%24
            screen.fillRect(x,78-h,23,h,8)
            screen.fillRect(x+4,70-h,5,8,8)
        }
        // Distant lit windows and stepped factory roofs.
        for(let i=0;i<19;i++) {
            let x=(i*23+7)%158,y=57+(i*11)%18
            screen.fillRect(x,y,2,2,i%5==0?13:11)
        }
        screen.fillRect(0,78,160,42,15)
        // Headframe (the tower over the shaft), pulley, steel struts and the winch house.
        screen.drawLine(37,82,52,22,10);screen.drawLine(39,82,54,22,8)
        screen.drawLine(86,82,69,22,10);screen.drawLine(84,82,67,22,8)
        screen.fillRect(48,19,25,5,14);screen.drawCircle(60,18,7,10)
        screen.drawLine(49,32,75,49,8);screen.drawLine(73,32,45,49,8)
        screen.drawLine(45,49,80,67,8);screen.drawLine(76,49,40,67,8)
        screen.drawLine(60,19,60,88,10);screen.drawLine(64,19,64,88,8)
        screen.fillRect(99,67,47,16,14);screen.fillRect(112,59,21,9,14)
        for(let i=0;i<4;i++)screen.fillRect(104+i*10,71,4,4,Math.floor(sceneMs/500)%11==0?13:5)
        screen.fillRect(42,82,45,4,13)
        screen.drawLine(0,84,159,84,8)
        screen.drawLine(28,118,51,86,8);screen.drawLine(94,118,74,86,8)
        screen.drawLine(32,118,54,86,14);screen.drawLine(90,118,71,86,14)
        for(let i=0;i<5;i++) {
            let y=90+i*i
            screen.drawLine(48-i*4,y,77+i*4,y,11)
        }
        screen.drawLine(151,43,151,82,10)
        screen.fillRect(147,42,9,2,5)
        screen.drawLine(151,45,136,81,11);screen.drawLine(151,45,159,73,11)
        // A wet road, low drifting fog and reflected service lights.
        for(let i=0;i<14;i++) {
            let x=(i*31+Math.floor(sceneMs/130))%180-20,y=85+(i*7)%25
            screen.drawLine(x,y,x+10+i%9,y,i%4==0?10:11)
        }
        rain(sceneMs,38)
    }
    function titleArrival(sceneMs: number) {
        screen.fill(15)
        if(!reduced)for(let i=0;i<26;i++) {
            let phase=(sceneMs/12+i*17)%160
            let dx=(i*31%101)-50,dy=(i*43%71)-35
            let x=80+dx*phase/50,y=55+dy*phase/50
            screen.drawLine(x,y,x+dx*0.08,y+dy*0.08,sceneMs<1100?10:11)
        }
        // The heavy title drops into its place letter by letter (it does not drop with reduced effects); then a bright
        // line runs along below it from left to right.
        let settle=reduced?0:Math.max(0,1-sceneMs/650)
        let y=43-Math.floor(settle*settle*24)
        logo(y,Math.floor(sceneMs/75))
        if(sceneMs>850) {
            screen.drawLine(15,68,144,68,8)
            let sweep=Math.min(130,(sceneMs-850)/4)
            screen.drawLine(15,68,15+sweep,68,13)
        }
        if(sceneMs>1000)centered("FIND 5 FUSES!",79,5)
        if(sceneMs>1400)centered("YOUR SHIFT BEGINS.",96,12)
        bars(10)
    }
    function intro() {
        let filmTimeMs=introFilmTimeMs(ageMs)
        if(filmTimeMs>=34500)titleArrival(filmTimeMs-34500)
        else Cinema.draw(filmTimeMs,reduced,smallFont)
        // Footer with one set of colors for each palette (color 13 would be black on black in the studio palette).
        let studio=Cinema.studioActive()
        centered("A/B: SKIP",112,studio?11:10)
        screen.fillRect(0,119,Math.min(160,ageMs*160/introDurationMs),1,studio?11:13)
    }
    function title() {
        skyline(ageMs+4000)
        // One frame surrounds all rows, with room for the highlight bar of the selection.
        screen.fillRect(4,19,152,91,15)
        screen.drawRect(4,19,152,91,10)
        screen.drawRect(6,21,148,87,8)
        for(let x=8;x<154;x+=144) {
            screen.setPixel(x,23,12);screen.setPixel(x,105,10)
        }
        logo(28,GAME_NAME.length)
        centered("5 FUSES. 1 ROBOT.",53,12)
        for(let i=0;i<4;i++) {
            let y=63+i*9
            if(menu==i) screen.fillRect(12,y-1,136,9,8)
            let label=i==0?"START SHIFT":i==1?"TRAINING":
                i==2?(reduced?"EFFECTS: REDUCED":"EFFECTS: CINEMA"):
                (muted?"SOUND: OFF":"SOUND: ON")
            text(label,28,y,menu==i?1:10)
            if(menu==i)text(">",17,y,5)
        }
        screen.fillRect(0,112,160,8,15)
        centered("D-PAD: SELECT  A: OK",112,10)

        centered("UNDERGROUND / -480 M",10,12)
    }
    function tutorialChoice() {
        screen.fill(15)
        screen.drawLine(12,18,147,18,10)
        centered("MAINTENANCE LOG / 09",9,5)
        centered("BEFORE YOU GO DOWN",30,1)
        centered("Light, whistle and Brummi.",46,12)
        centered("Learn in a safe room.",56,12)
        screen.fillRect(15,73,130,13,8);centered("A  START TRAINING",77,1)
        centered("B  START SHIFT NOW",96,5)
        centered("Training can be skipped.",112,10)
    }
    // Monitor of the control room in the lift room: the Calliope Hacker seen from behind at his desk, hood up,
    // black hoodie with a light edge, turquoise chair and sneakers. The screen glows: darkness() leaves a hole
    // in the mask there, so you can see it from the first second of every shift and every training.
    export const MONITOR_X = 9
    export const MONITOR_Y = 81
    function controlMonitor() {
        let x=MONITOR_X,y=MONITOR_Y
        backdrop.fillRect(x,y,26,18,14);backdrop.drawRect(x,y,26,18,10);backdrop.fillRect(x+10,y+18,6,2,13)
        backdrop.fillRect(x+2,y+2,22,14,10)
        // his own screen on the desk, with a yellow dot: Brummi on the plan of the mine
        backdrop.fillRect(x+13,y+3,9,6,8);backdrop.fillRect(x+14,y+4,7,4,9);backdrop.setPixel(x+17,y+5,5)
        backdrop.fillRect(x+2,y+10,22,2,13)
        // hood and hoodie in black (15) with a light edge (12)
        backdrop.drawLine(x+7,y+3,x+8,y+3,15)
        backdrop.fillRect(x+6,y+4,4,4,15);backdrop.fillRect(x+5,y+8,7,6,15)
        backdrop.setPixel(x+6,y+3,12);backdrop.drawLine(x+5,y+4,x+5,y+7,12)
        backdrop.drawLine(x+4,y+8,x+4,y+13,12)
        backdrop.fillRect(x+11,y+9,3,2,15)
        // chair and sneakers in turquoise (9)
        backdrop.drawLine(x+4,y+14,x+12,y+14,9);backdrop.setPixel(x+5,y+15,9);backdrop.setPixel(x+11,y+15,9)
    }
    // Cached background of a room. The shapes match exactly the tiles the player bumps into.
    function roomArt() {
        backdrop.fill(15)
        let r=rooms[room]
        for(let y=0;y<15;y++)for(let x=0;x<20;x++) {
            let t=r.tiles.getUint8(y*20+x),pixelX=x*8,pixelY=y*8
            if(t==1) {
                backdrop.fillRect(pixelX,pixelY,8,8,14)
                backdrop.drawLine(pixelX,pixelY,pixelX+7,pixelY,10)
                backdrop.drawLine(pixelX,pixelY,pixelX,pixelY+7,8)
                backdrop.drawLine(pixelX+1,pixelY+6,pixelX+7,pixelY+6,11)
                backdrop.setPixel(pixelX+2,pixelY+2,12)
                if(!wall(room,x,y+1)) {
                    backdrop.fillRect(pixelX,pixelY+4,8,4,8)
                    backdrop.drawLine(pixelX,pixelY+4,pixelX+7,pixelY+4,10)
                    backdrop.drawLine(pixelX,pixelY+7,pixelX+7,pixelY+7,15)
                }
                if(!wall(room,x+1,y))backdrop.drawLine(pixelX+7,pixelY,pixelX+7,pixelY+7,15)
            } else {
                backdrop.fillRect(pixelX,pixelY,8,8,(x+y)%2==0?11:15)
                backdrop.drawLine(pixelX,pixelY,pixelX+7,pixelY,8)
                backdrop.setPixel(pixelX+1,pixelY+1,14)
                if((x*13+y*7+room)%5==0) {
                    backdrop.drawLine(pixelX+3,pixelY+5,pixelX+6,pixelY+5,14)
                    backdrop.setPixel(pixelX+2,pixelY+6,8)
                }
                if(wall(room,x,y-1))backdrop.fillRect(pixelX,pixelY,8,2,15)
                if(t==2) {
                    backdrop.fillRect(pixelX+1,pixelY+3,6,3,15)
                    backdrop.drawLine(pixelX+1,pixelY+2,pixelX+6,pixelY+5,13)
                    backdrop.drawLine(pixelX+3,pixelY+6,pixelX+5,pixelY+1,4)
                    backdrop.setPixel(pixelX+2,pixelY+2,12)
                }
                if(t==3) {
                    backdrop.fillRect(pixelX,pixelY,8,8,8)
                    backdrop.drawLine(pixelX+1,pixelY+2,pixelX+5,pixelY+2,10)
                    backdrop.drawLine(pixelX+3,pixelY+5,pixelX+7,pixelY+5,9)
                    backdrop.setPixel(pixelX+1,pixelY+6,7)
                }
            }
        }
        // Pipes on the ceiling, rings around them and a sign with the number of the room.
        backdrop.fillRect(12,12,136,5,15)
        backdrop.fillRect(12,12,136,3,10)
        backdrop.drawLine(12,12,147,12,12)
        for(let x=16;x<146;x+=22) {
            backdrop.fillRect(x,11,3,5,14);backdrop.setPixel(x+1,12,13)
        }
        backdrop.fillRect(118,18,27,10,15)
        backdrop.drawRect(118,18,27,10,8)
        backdrop.print((room<10?"0":"")+room,124,21,10,smallFont)
        // Each kind of room has its own outlines.
        if(r.kind==Kind.Generator || r.kind==Kind.Lift) {
            backdrop.fillRect(57,37,40,31,8)
            backdrop.drawRect(57,37,40,31,10)
            for(let x=58;x<97;x+=6) {
                backdrop.drawLine(x,37,x+3,40,5)
                backdrop.drawLine(x,64,x+3,67,4)
            }
            if(r.kind==Kind.Lift) {
                backdrop.fillRect(61,42,32,21,15)
                for(let x=63;x<92;x+=5)backdrop.drawLine(x,43,x,61,10)
                backdrop.drawLine(77,42,77,62,12)
                backdrop.fillRect(97,45,5,12,14);backdrop.setPixel(99,48,9)
                controlMonitor()
            } else {
                backdrop.drawLine(76,37,76,19,13)
                backdrop.drawLine(78,37,78,19,4)
                backdrop.fillRect(60,70,33,6,15)
                for(let x=62;x<91;x+=3)backdrop.drawLine(x,71,x,74,10)
            }
        }
        if(r.kind==Kind.Workshop || r.kind==Kind.Store) {
            backdrop.fillRect(13,88,13,17,15)
            backdrop.fillRect(12,86,13,16,13)
            backdrop.drawRect(12,86,13,16,10)
            backdrop.drawLine(14,88,22,99,14);backdrop.drawLine(22,88,14,99,14)
            backdrop.drawLine(12,86,24,86,12)
            backdrop.fillRect(130,96,14,9,8)
            for(let x=132;x<143;x+=3)backdrop.drawLine(x,97,x,103,10)
        }
        if(r.kind==Kind.Hall) {
            backdrop.fillRect(88,18,7,26,15)
            backdrop.drawLine(90,18,90,41,13);backdrop.drawLine(92,18,92,41,10)
            backdrop.drawCircle(93,43,4,13);backdrop.fillRect(94,38,4,4,11)
            backdrop.drawLine(12,94,147,94,8);backdrop.drawLine(12,97,147,97,14)
        }
        if(r.kind==Kind.Dock) {
            // Charging dock: a base under Brummi's parking spot (116, 60), a charging post with a yellow lamp,
            // a cable to the wall and a sign with Brummi's head.
            backdrop.fillRect(106,64,21,5,13);backdrop.drawLine(106,64,126,64,12)
            backdrop.drawLine(107,68,125,68,14)
            backdrop.fillRect(130,44,6,25,10);backdrop.drawLine(130,44,135,44,12)
            backdrop.drawLine(135,45,135,68,14)
            backdrop.fillRect(131,47,4,3,5);backdrop.fillRect(131,53,4,8,14)
            backdrop.setPixel(132,55,9);backdrop.setPixel(132,58,9)
            backdrop.drawLine(126,66,129,66,14)
            backdrop.drawLine(136,50,151,50,14);backdrop.drawLine(136,51,151,51,8)
            backdrop.fillRect(96,36,15,12,14);backdrop.drawRect(96,36,15,12,10)
            backdrop.fillRect(100,40,7,5,12);backdrop.setPixel(103,38,5);backdrop.setPixel(103,39,10)
            backdrop.setPixel(101,42,9);backdrop.setPixel(105,42,9);backdrop.drawLine(102,44,104,44,10)
        }
        for(let d=0;d<4;d++)if(r.doors[d]>=0) {
            let x=d==0?150:d==2?6:73,y=d==1?108:d==3?6:57
            if(d%2==0) {
                backdrop.fillRect(x,y-3,4,3,10);backdrop.fillRect(x,y+15,4,3,10)
                backdrop.drawLine(x+1,y,x+1,y+13,13)
            } else {
                backdrop.fillRect(x-3,y,3,4,10);backdrop.fillRect(x+15,y,3,4,10)
                backdrop.drawLine(x,y+1,x+13,y+1,13)
            }
        }
    }
    function drawObject(o: Thing) {
        let x=Math.floor(o.x),y=Math.floor(o.y)
        screen.fillRect(x-5,y+4,12,3,15)
        if(o.kind==Item.Fuse) {
            screen.fillRect(x-4,y-3,9,7,13)
            screen.fillRect(x-3,y-2,7,5,5)
            screen.fillRect(x-1,y-3,3,7,1)
            screen.drawLine(x-1,y,x+1,y,9)
            screen.setPixel(x-4,y-3,12);screen.setPixel(x+4,y+3,4)
        } else if(o.kind==Item.Battery) {
            screen.fillRect(x-4,y-4,8,9,8)
            screen.fillRect(x-3,y-4,6,8,7)
            screen.drawLine(x-3,y-4,x+2,y-4,1)
            screen.fillRect(x-1,y-6,2,2,12)
            screen.drawLine(x-1,y-1,x+1,y-1,1);screen.drawLine(x,y-2,x,y,1)
            screen.drawLine(x-3,y+3,x+2,y+3,10)
        } else if(o.kind==Item.Locker) {
            screen.fillRect(x-6,y-8,13,17,15)
            screen.fillRect(x-6,y-8,11,15,10)
            screen.drawLine(x-6,y-8,x+4,y-8,12)
            screen.fillRect(x+4,y-7,2,14,8)
            screen.drawRect(x-4,y-6,7,12,8)
            for(let n=0;n<3;n++)screen.drawLine(x-3,y-4+n*2,x+1,y-4+n*2,15)
            screen.setPixel(x+1,y+3,5);screen.setPixel(x+2,y+3,4)
            screen.fillRect(x-5,y+7,2,2,13);screen.fillRect(x+3,y+7,2,2,13)
        } else if(o.kind==Item.Generator) {
            screen.fillRect(x-9,y-8,19,17,15)
            screen.fillRect(x-9,y-8,17,14,10)
            screen.drawLine(x-8,y-8,x+7,y-8,12)
            screen.fillRect(x-7,y-6,14,10,8)
            screen.fillRect(x+8,y-6,2,13,14)
            for(let i=0;i<5;i++) {
                screen.fillRect(x-6+i*3,y-4,2,4,i<installed?9:13)
                if(i<installed)screen.setPixel(x-6+i*3,y-4,1)
            }
            screen.drawLine(x-5,y+3,x+4,y+3,installed==5?9:4)
            screen.fillRect(x-6,y+6,3,3,13);screen.fillRect(x+4,y+6,3,3,13)
            screen.setPixel(x-8,y-6,5);screen.setPixel(x-8,y+4,12)
        }
    }
    function player() {
        if(hidden>=0)return
        drawPlayerAt(Math.floor(playerX),Math.floor(playerY),
            faceX,faceY,lamp,Math.floor((playerX+playerY)/3)%2)
    }
    function drawPlayerAt(x: number,y: number,faceX: number,
        faceY: number,lamp: boolean,stride: number) {
        screen.fillRect(x-4,y+4,9,3,15)
        screen.fillRect(x-2,y+2,2,3+stride,8);screen.fillRect(x+1,y+2,2,4-stride,8)
        screen.setPixel(x-2,y+5+stride,13);screen.setPixel(x+2,y+6-stride,13)
        screen.fillRect(x-3,y-2,7,5,10)
        screen.drawLine(x-2,y,x+2,y,5)
        screen.fillRect(x-1,y-3,3,3,13)
        screen.fillRect(x-3,y-6,6,4,4)
        screen.fillRect(x-2,y-6,4,2,5)
        screen.drawLine(x-3,y-3,x+3,y-3,5)
        screen.setPixel(x-1,y-5,1)
        let lampX=x+Math.round(faceX*4),lampY=y+Math.round(faceY*4)
        screen.fillRect(lampX-1,lampY-1,3,3,13)
        screen.setPixel(lampX+Math.round(faceX),
            lampY+Math.round(faceY),lamp?1:12)
    }
    // Small signs above Brummi, 3 x 5 pixels, row by row: ? ! z and a note.
    const SIGNS = ["111001010000010", "010010010000010", "111001010100111", "011010010110110"]
    function sign(index: number,x: number,y: number) {
        let bits=SIGNS[index]
        for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(bits.charAt(j*3+i)=="1")screen.setPixel(x+i,y+j,5)
    }
    // Brummi, the maintenance robot: a light, round body, a domed head with two turquoise lamp eyes,
    // an antenna with a yellow light, two tracks and two grippers. Never in the colors 2, 3 or 6.
    // x, y: center of the body; the picture reaches from x-7 to x+7 (x+8 with the carried fuse) and from y-10 to y+5;
    // the signs reach from x-8 to x+9 and up to y-19 (the second z at the dock).
    // light: color of the antenna light (5 yellow, 1 while beeping, 13 dim at the dock).
    // arms: 0 down, 1 right gripper up with a fuse, 2 both up (dancing, waving).
    export function robot(x: number,y: number,state: number,
        tread: number,light: number,arms: number) {
        // tracks
        screen.fillRect(x-5,y+3,4,3,14);screen.fillRect(x+2,y+3,4,3,14)
        screen.setPixel(x-5+tread,y+4,10);screen.setPixel(x-3+tread,y+4,10)
        screen.setPixel(x+2+tread,y+4,10);screen.setPixel(x+4+tread,y+4,10)
        // body with rounded corners, shadow on the right and below, a small panel with two buttons
        screen.fillRect(x-4,y-3,9,7,12);screen.fillRect(x-5,y-2,11,5,12)
        screen.drawLine(x+5,y-2,x+5,y+2,10);screen.drawLine(x-4,y+3,x+4,y+3,10)
        screen.fillRect(x-2,y-1,5,3,14);screen.setPixel(x-1,y,5);screen.setPixel(x+1,y,9)
        // domed head, antenna and light
        screen.fillRect(x-3,y-7,7,4,12);screen.fillRect(x-2,y-8,5,1,12);screen.drawLine(x+3,y-6,x+3,y-4,10)
        screen.fillRect(x-1,y-10,3,2,light)
        // eyes: two turquoise lamps; they look back and forth while he searches and are almost closed at the dock
        let look=state==Bot.Look?(Math.floor(elapsedMs/500)%2)*2-1:0
        if(state==Bot.Dock) {
            screen.drawLine(x-2,y-5,x-1,y-5,10)
            screen.drawLine(x+1,y-5,x+2,y-5,10)
        }
        else {
            screen.fillRect(x-2+look,y-6,2,2,9);screen.fillRect(x+1+look,y-6,2,2,9)
            screen.setPixel(x-2+look,y-6,1);screen.setPixel(x+1+look,y-6,1)
        }
        screen.drawLine(x-1,y-4,x+1,y-4,10)
        // grippers
        if(arms==0) {
            screen.drawLine(x-6,y-1,x-6,y+1,12);screen.setPixel(x-7,y+1,14)
            screen.drawLine(x+6,y-1,x+6,y+1,12);screen.setPixel(x+7,y+1,14)
        } else {
            screen.drawLine(x+6,y-2,x+6,y-5,12);screen.setPixel(x+5,y-6,14);screen.setPixel(x+7,y-6,14)
            if(arms==2) {
                screen.drawLine(x-6,y-2,x-6,y-5,12)
                screen.setPixel(x-7,y-6,14);screen.setPixel(x-5,y-6,14)
            }
            else {
                screen.drawLine(x-6,y-1,x-6,y+1,12);screen.setPixel(x-7,y+1,14)
                // the fuse he carries back, held above the right gripper
                screen.fillRect(x+4,y-10,5,4,13);screen.fillRect(x+5,y-9,3,2,5);screen.setPixel(x+6,y-10,1)
            }
        }
        // what he is doing: ? curious, ! wants to tidy up, ... searching, two notes listening, z charging
        if(state==Bot.Curious)sign(0,x-1,y-16)
        else if(state==Bot.Follow)sign(1,x-1,y-16)
        else if(state==Bot.Look) {
            screen.setPixel(x-3,y-13,5);screen.setPixel(x,y-13,5);screen.setPixel(x+3,y-13,5)
        }
        else if(state==Bot.Listen) {
            let up=Math.floor(elapsedMs/250)%2
            sign(3,x-8,y-15+up)
            sign(3,x+5,y-14-up)
        }
        else if(state==Bot.Dock) {
            sign(2,x+4,y-14)
            if(Math.floor(elapsedMs/1000)%2==0)sign(2,x+7,y-19)
        }
    }
    // Brummi in the world: drawn after darkness(), so he is never hidden. Where the player's light does not reach him,
    // a soft halo (a circle in color 8, dark blue-gray) shows him, also behind walls and at the dock.
    function drawBrummi() {
        if(brummi.room!=room)return
        let state=brummi.state,x=Math.floor(brummi.x),y=Math.floor(brummi.y)
        if(state==Bot.Listen)x+=Math.floor(elapsedMs/250)%2
        if(!visible(brummi.x,brummi.y)) {
            screen.fillCircle(x,y-2,9,8)
            // keep the player in front of the halo when the two are close together
            if(Math.abs(playerX-brummi.x)<17 && Math.abs(playerY-brummi.y)<17)player()
        }
        let light=state==Bot.Dock?13:warningMs>0 && mode==Mode.Play?1:5
        robot(x,y,state,state==Bot.Listen
            || state==Bot.Dock?0:Math.floor((brummi.x+brummi.y)/3)%2,light,
            state==Bot.Carry && brummi.cargo>=0
                ?1:state==Bot.Listen?2:0)
    }
    // Antenna in the dashboard: two arcs, yellow while Brummi beeps.
    function antenna(x: number,y: number,on: boolean) {
        let ink=on?5:10
        screen.fillRect(x-1,y,3,2,on?5:12);screen.drawLine(x,y+2,x,y+7,10);screen.drawLine(x-2,y+8,x+2,y+8,10)
        screen.setPixel(x-3,y,ink);screen.drawLine(x-4,y+1,x-4,y+3,ink)
        screen.setPixel(x-3,y+4,ink)
        screen.setPixel(x+3,y,ink);screen.drawLine(x+4,y+1,x+4,y+3,ink)
        screen.setPixel(x+3,y+4,ink)
        if(on) {screen.drawLine(x-6,y,x-6,y+4,5);screen.drawLine(x+6,y,x+6,y+4,5)}
    }
    // Curiosity bar: how long Brummi has been seeing the player carrying a fuse; it is full after 600 milliseconds
    // (frame color 10, yellow fill).
    function curiosity(x: number,y: number) {
        screen.drawRect(x,y,40,4,10);screen.fillRect(x+1,y+1,38*Math.min(1,brummi.exposureMs/600),2,5)
    }
    // A fan of short rays that end at walls makes soft edges of light.
    // The built-in triangle fills save us from handling every screen pixel one by one in TypeScript.
    function lightFan(radius: number, segments: number, full: boolean) {
        let lastX=playerX,lastY=playerY
        for(let i=0;i<=segments;i++) {
            let angle=full?i*Math.PI*2/segments:-Math.PI/6+i*Math.PI/3/segments
            let cosAngle=Math.cos(angle),sinAngle=Math.sin(angle)
            let dx=full?cosAngle:faceX*cosAngle-faceY*sinAngle,
                dy=full?sinAngle:faceY*cosAngle+faceX*sinAngle
            let endX=playerX,endY=playerY
            for(let distance=2;distance<=radius;distance+=2) {
                endX=playerX+dx*distance;endY=playerY+dy*distance
                if(wall(room,Math.floor(endX/8),Math.floor(endY/8)))break
            }
            if(i>0)mask.fillTriangle(playerX,playerY,lastX,lastY,endX,endY,0)
            lastX=endX;lastY=endY
        }
    }
    function darkness() {
        let direction=Math.round(faceX*10)+Math.round(faceY*10)*30
        let light=lamp
        if(maskRoom!=room || maskX!=playerX || maskY!=playerY || maskDirection!=direction
            || maskLight!=light || maskHidden!=hidden) {
            if(elapsedMs-maskTimeMs>=40 || maskRoom!=room
                || maskLight!=light || maskHidden!=hidden) {
                mask.fill(15)
                for(let y=0;y<15;y++)for(let x=0;x<20;x++) {
                    let pixelX=x*8,pixelY=y*8
                    if(wall(room,x,y)) {
                        mask.fillRect(pixelX,pixelY,8,7,11)
                        if(!wall(room,x,y+1))mask.drawLine(pixelX,pixelY+4,pixelX+7,pixelY+4,8)
                    } else if((x+y)%2==0)mask.drawLine(pixelX,pixelY,pixelX+7,pixelY,11)
                    if(hidden>=0 && visible(pixelX+4,pixelY+4))mask.fillRect(pixelX,pixelY,8,8,0)
                }
                // The monitor of the control room in the lift room glows.
                if(room==0)mask.fillRect(MONITOR_X,MONITOR_Y,26,20,0)
                if(hidden<0) {
                    lightFan(12,16,true)
                    if(light)lightFan(64,32,false)
                }
                maskX=playerX;maskY=playerY;maskDirection=direction;maskRoom=room
                maskLight=light;maskHidden=hidden;maskTimeMs=elapsedMs
            }
        }
        screen.drawTransparentImage(mask,0,0)
    }
    function arrow(x: number,y: number,d: number,color: number) {
        if(d==0 || d==2) {
            let sign=d==0?1:-1
            screen.drawLine(x-3*sign,y,x+3*sign,y,color)
            screen.drawLine(x,y-3,x+3*sign,y,color);screen.drawLine(x,y+3,x+3*sign,y,color)
        } else {
            let sign=d==1?1:-1
            screen.drawLine(x,y-3*sign,x,y+3*sign,color)
            screen.drawLine(x-3,y,x,y+3*sign,color);screen.drawLine(x+3,y,x,y+3*sign,color)
        }
    }
    function waymarks() {
        let next=roomRoute(room,installed>=5?0:4,true)
        for(let d=0;d<4;d++) {
            let n=rooms[room].doors[d]
            if(n<0)continue
            let x=d==0?151:d==2?8:79,y=d==1?102:d==3?18:63
            if(installed>=5 || room==0 || room==1 || rooms[n].visited) {
                arrow(x,y,d,n==next?5:10)
                if(n==next && (installed>=5 || room==0 || room==1)) {
                    // Below the arrow, except for the door at the bottom: there the sign stands next to the arrow,
                    // so the bar at the bottom of the screen does not cover it.
                    let signX=d==1?x+5:x-2,signY=d==1?y-3:y+6
                    if(installed>=5)doorIcon(signX,signY,5)
                    else text("G",signX,signY,5)
                }
            }
        }
    }
    function tutorialOverlay() {
        screen.fillRect(0,0,160,24,15)
        screen.drawLine(0,0,159,0,8)
        screen.fillRect(0,3,2,17,5)
        centered(tutorialTitles[step],3,5)
        // The lesson line keeps two pixels of space to the yellow stripe (x 0 to 1): it never starts left of x 4,
        // so a line of 26 letters stands from x 4 to x 159; shorter lines stay centered.
        let lesson=tutorialLines[step]
        text(lesson,Math.max(4,Math.floor((160-lesson.length*6)/2)),13,1)
        screen.fillRect(0,23,160*(step+1)/tutorialTitles.length,1,10)
        if(step==0) {
            screen.drawCircle(116,76,6,5);arrow(116,64,1,5)
        }
        // The targets in the training stay visible so it is clear where to go.
        let target=step==3?0:step==4?1:step==5?2:-1
        if(target>=0) {drawObject(objects[target]);arrow(objects[target].x,objects[target].y+13,3,5)}
        // Steps 4 to 6: the numbers of the dashboard (it lies under the training bar) with their pictures;
        // in step 4 an arrow points to the number of the bag, in step 5 to the number of the generator.
        if(target>=0) {
            screen.fillRect(94,25,65,12,15);screen.drawRect(94,25,65,12,10)
            installedIcon(97,27);text(installed+"/5",108,27,9)
            bagIcon(129,27);text(carried+"/3",138,27,5)
            if(step==3)arrow(147,42,3,5)
            if(step==4)arrow(117,42,3,5)
        }
        // Step 7: Brummi beeps, and the antenna (normally in the dashboard under this bar) blinks here.
        if(step==6)antenna(150,2,warningMs>0)
        // Step 12: the training battery, visible in the dark, with an arrow from above.
        if(step==11) {
            if(objects.length>3 && !objects[3].taken) {
                drawObject(objects[3]);arrow(objects[3].x,objects[3].y-13,1,5)
            }
            // the lamp bar of the dashboard lies under the training bar: so it is shown here below the board
            screen.fillRect(4,59,46,9,15);lampBar(6,61)
        }
        if(step==4) {
            let generator=objects[1]
            let ready=selected==1
            if(ready)screen.drawRect(generator.x-10,generator.y-9,20,18,9)
            screen.fillRect(4,75,152,29,15)
            if(inserting) {
                centered("INSERTING  "+Math.min(3,Math.floor(insertMs/1000))+
                    " / 3 SEC.",77,9)
                screen.drawRect(29,87,102,6,10)
                screen.fillRect(30,88,Math.min(100,insertMs/30),4,9)
                centered("KEEP HOLDING A",96,12)
            } else {
                centered(ready?(aLatch?"RELEASE A, HOLD AGAIN":"READY: HOLD A"):
                    "MOVE CLOSER TO GENERATOR",80,ready?9:5)
                centered("RELEASE DIRECTION KEYS",94,12)
            }
        }
        if(step==2) {screen.drawRect(29,98,102,4,10);screen.fillRect(30,99,Math.min(100,progress/20),2,5)}
        if(step==5 && hidden>=0) {
            screen.fillRect(0,89,160,11,15);centered("GOOD. A: STEP OUT AGAIN",91,5)
        }
        if(step>=6 && step<=11) {
            // The rule is written above the demonstration without covering it.
            screen.fillRect(3,27,154,31,15)
            if(step==6) {
                centered("HE TAKES WHAT YOU CARRY",29,5)
                centered("AND PUTS IT BACK.",39,5)
                centered("BEEPS: HE IS NEAR. A: NEXT",49,12)
            } else if(step==7) {
                centered("LIGHT ATTRACTS BRUMMI.",29,5)
                centered("IN THE DARK HE SEES LESS.",39,12)
                centered("UP CLOSE, HE SPOTS YOU.",49,12)
                // the curiosity bar is always shown in this step, right above Brummi
                curiosity(Math.floor(brummi.x)-20,Math.floor(brummi.y)-17)
            } else if(step==8) {
                centered("RUNNING ATTRACTS BRUMMI.",29,5)
                centered("WALKING IS QUIETER.",39,12)
                centered("HE HEARS THE GENERATOR.",49,12)
                screen.drawRect(29,99,102,4,10)
                screen.fillRect(30,100,Math.min(100,progress/10),2,5)
            } else if(step==9) {
                centered("WHISTLE WHEN HE IS NEAR.",29,5)
                centered("THEN HE STOPS FOR A BIT.",39,12)
                centered("HE LISTENS AND DANCES.",49,12)
                arrow(109,76,0,5)
                screen.fillRect(4,94,152,15,15)
                centered(cooldownMs>0?
                    "WHISTLE READY IN "+Math.ceil(cooldownMs/1000)+" SEC.":
                    "HOLD B",97,cooldownMs>0?10:5)
            } else if(step==10) {
                centered("NOW GET AWAY QUICKLY!",29,5)
                centered("HE ONLY STOPS FOR 2.5 SEC.",39,12)
                centered("RUN: A + DIRECTION",49,12)
                screen.drawCircle(40,76,6,5);arrow(52,76,2,5)
            } else {
                centered("YOUR LAMP SLOWLY RUNS LOW.",29,5)
                centered("BATTERIES CHARGE IT.",39,12)
                centered("EMPTY? THE SHIFT IS OVER.",49,12)
            }
            if(step!=8 && step!=9)centered("SAFE TRAINING",101,10)
        }
        screen.fillRect(0,112,160,8,15);centered("MENU BUTTON: SKIP",112,10)
        if(step==12) {
            screen.fillRect(2,36,156,61,15);screen.drawRect(2,36,156,61,10)
            centered("YOU ARE READY.",46,5)
            centered("5 fuses. One way out.",62,12)
            centered("A  BEGIN SHIFT",80,1)
        }
    }
    // Lamp bar: orange below 20 %; its frame changes color once per second (no fast blinking).
    function lampBar(x: number,y: number) {
        let low=battery<20
        screen.drawRect(x,y,25,5,low?(Math.floor(elapsedMs/1000)%2==0?4:12):10)
        screen.fillRect(x+1,y+1,Math.max(0,23*battery/100),3,low?4:5)
        text(""+Math.ceil(battery),x+28,y,12)
    }
    function dashboard() {
        screen.fillRect(0,0,160,11,15)
        screen.drawLine(0,10,159,10,8)
        lampBar(3,3)
        installedIcon(53,3);text(installed+"/5",64,3,9)
        bagIcon(91,3);text(carried+"/3",100,3,5)
        if(beepDistance<=12)antenna(150,1,warningMs>0)
        if(carried>0 && brummi.exposureMs>0 && brummi.state!=Bot.Follow)curiosity(60,13)
        if(bHoldMs>0) {
            screen.drawRect(Math.floor(playerX)-7,Math.floor(playerY)+8,14,3,10)
            screen.fillRect(Math.floor(playerX)-6,Math.floor(playerY)+9,12*Math.min(1,bHoldMs/350),1,5)
        }
        if(cooldownMs>0) {whistleIcon(137,13);text(""+Math.ceil(cooldownMs/1000),147,13,10)}
        screen.fillRect(0,112,160,8,15)
        if(inserting) {
            text("INSERT",4,112,5);screen.drawRect(65,114,89,4,10)
            screen.fillRect(66,115,87*insertMs/3000,2,9)
        } else if(messageTimeMs>0) {
            // Brummi put a fuse back: fuse picture and the name of the room where it lies again.
            if(messageIcon) {
                let x=Math.floor((160-messageText.length*6-10)/2)
                fuseIcon(x,112)
                text(messageText,x+10,112,5)
            }
            else centered(messageText,112,5)
        }
        else if(selected>=0) {
            let o=objects[selected],label=o.kind==Item.Fuse?"A: TAKE FUSE":
                o.kind==Item.Battery?
                    "A: BATTERY +"+Math.min(BATTERY_GAIN,Math.floor(100-battery)):
                o.kind==Item.Locker?(hidden>=0?"A: LEAVE LOCKER":"A: HIDE"):
                o.kind==Item.Generator?"HOLD A: INSERT":"LIFT / NO POWER"
            centered(label,112,12)
        } else {centered(ageMs%6000<4000?rooms[room].name:"MENU BUTTON: PAUSE",112,10)}
        if(transitionMs>0) {screen.fillRect(3,49,154,13,15);centered(rooms[room].name,53,5)}
    }
    function world() {
        if(backdropRoom!=room || backdropSeed!=seed) {
            roomArt()
            backdropRoom=room
            backdropSeed=seed
        }
        screen.drawImage(backdrop,0,0)
        for(let i=0;i<objects.length;i++)if(objects[i].room==room && !objects[i].taken)drawObject(objects[i])
        if(!reduced && lamp)for(let i=0;i<7;i++) {
            let x=(i*37+Math.floor(elapsedMs/160))%144+8
            let y=(i*23+Math.floor(elapsedMs/240))%92+16
            if(visible(x,y))screen.setPixel(x,y,i%3==0?12:10)
        }
        player();darkness();drawBrummi();waymarks()
        // Whistle: two rings around the player, radius 6 to 17 in 300 milliseconds. They only show the sound; the light
        // does not change.
        if(whistleFxMs>0) {
            let r=6+Math.floor((300-whistleFxMs)/25),
                cx=Math.floor(playerX),cy=Math.floor(playerY)
            screen.drawCircle(cx,cy,r,9)
            if(r>10)screen.drawCircle(cx,cy,r-5,9)
        }
        dashboard()
        if(mode==Mode.Tutorial)tutorialOverlay()
    }
    function pauseView() {
        screen.fill(15)
        centered("SHIFT PAUSED",18,5)
        screen.drawLine(15,29,145,29,10)
        for(let i=0;i<4;i++) {
            let label=i==0?"RESUME":
                i==1?(previousMode==Mode.Tutorial?"SKIP TRAINING":
                    (reduced?"EFFECTS: REDUCED":"EFFECTS: CINEMA")):
                i==2?(muted?"SOUND: OFF":"SOUND: ON"):
                "TITLE SCREEN"
            text(label,23,38+i*13,menu==i?1:10)
            if(menu==i)text(">",13,38+i*13,5)
        }
        centered("D-PAD: SELECT  A: OK",112,10)
    }
    // Result cards: nobody loses anything here. If the lamp is empty, only the shift is over.
    function result() {
        screen.fill(15)
        let wave=Math.floor(ageMs/500)%2
        let seconds=Math.floor(timeMs/1000),y=75
        if(won) {
            for(let i=0;i<6;i++)screen.drawLine(35+i*18,15,35+i*18,45,8)
            screen.fillRect(32,35,98,4,5)
            // Brummi waves next to the lift
            robot(142,38,Bot.Patrol,0,5,wave?2:0)
            centered("ABOVE. AT LAST.",51,1)
            centered(timesNoticed==0?"QUIET MOUSE / NEVER SEEN":
                fusesTaken==0?"NOTHING LOST!":"SHIFT COMPLETE!",66,5)
        } else {
            // Brummi walks the player to the lift with his light (picture from y 8 to 35). The gate stands open:
            // its bars are folded to both sides, and the cabin is lit.
            screen.fillRect(52,8,56,27,14);screen.drawRect(52,8,56,27,10);screen.fillRect(60,10,40,23,11)
            for(let x=54;x<59;x+=2) {screen.drawLine(x,10,x,32,8);screen.drawLine(x+47,10,x+47,32,8)}
            screen.drawLine(40,35,120,35,13)
            screen.fillCircle(66,25,10,8)
            robot(66,29,Bot.Patrol,wave,5,wave?2:0)
            drawPlayerAt(88,28,-1,0,false,wave)
            centered("THAT'S IT FOR TODAY.",38,1)
            centered(cause,47,5)
            centered("BRUMMI WALKS YOU OUT.",56,12)
            // how far the shift got (fuses in the generator out of 5) and a tip
            installedIcon(65,66);text(installed+"/5",77,66,9)
            centered("TIP: PICK UP BATTERIES.",75,5)
            y=85
        }
        let gap=won?10:9
        centered("TIME "+Math.floor(seconds/60)+":"+(seconds%60<10?"0":"")+seconds%60,y,12)
        centered("BRUMMI VISITS: "+touches,y+gap,10)
        centered("WHISTLES "+whistles+"  MINE "+seed,y+2*gap,10)
        centered("A: RETRY  B: NEW MINE",won?109:112,5)
    }
    export function render() {
        // The wanted palette for this frame: the studio palette only in the control room and on the
        // studio card (Cinema.studioAt).
        Cinema.choosePalette(mode==Mode.Intro && Cinema.studioAt(introFilmTimeMs(ageMs)))
        if(mode==Mode.Intro)intro()
        else if(mode==Mode.Title)title()
        else if(mode==Mode.TutorialChoice)tutorialChoice()
        else if(mode==Mode.Play || mode==Mode.Tutorial)world()
        else if(mode==Mode.Pause)pauseView()
        else result()
    }
    export function invalidateArt() {backdropRoom=-1;maskRoom=-1}
}
