// The rules of the shift: rooms, player, Brummi, lamp, whistle, menus and training. Nothing is drawn or played here.
// Time comes in from outside as the value dt, so the game always runs the same way. sound() only remembers a wish for
// audio.ts. This file touches the pictures only to throw away its cached images (invalidateArt).
namespace Night {
    export enum Mode { Intro, Title, TutorialChoice, Tutorial, Play, Pause, Result }
    export enum Bot { Dock, Patrol, Curious, Follow, Look, Listen, Carry }
    // Kind says what a room is (Kind.Generator: the generator room); Item says what lies in a room
    // (Item.Generator: the generator itself, where the fuses go in).
    export enum Kind { Lift, Corridor, Workshop, Hall, Generator, Store, Dock }
    export enum Item { Fuse, Battery, Locker, Generator, Exit }
    export class RoomData {
        x: number; y: number; kind: Kind; name: string
        doors: number[]; tiles: Buffer; visited: boolean
        constructor(x: number, y: number, kind: Kind, name: string) {
            this.x = x; this.y = y; this.kind = kind; this.name = name
            this.doors = [-1, -1, -1, -1]; this.tiles = control.createBuffer(300); this.visited = false
        }
    }
    export class Thing {
        room: number; x: number; y: number; kind: Item; taken: boolean
        constructor(room: number, x: number, y: number, kind: Item) {
            this.room = room; this.x = x; this.y = y; this.kind = kind; this.taken = false
        }
    }
    export class Robot {
        constructor() {}
        room = 11; x = 116; y = 60; dx = -1; dy = 0
        state: Bot = Bot.Dock; targetRoom = 11; targetX = 116; targetY = 60
        timerMs = 0; lostMs = 0; exposureMs = 0; wakeMs = 0; observedLocker = -1
        routeX = 0; routeY = 0; routeAgeMs = 1000; routePitTile = -1; pauseMs = 0
        cargo = -1 // number of the fuse Brummi carries back (-1 = none)
    }
    // One timeline for picture and sound in the intro. Scenes you read get more time than scenes with action:
    // filmBeatsMs are points in time in the film, realBeatsMs are the same places in real time. In between, time is
    // stretched. The sounds keep their speed and pitch.
    export const introDurationMs = 64000
    const filmBeatsMs = [0,4200,5500,7000,9600,12700,14500,16200,18500,23000,23900,25500,34500,38000]
    const realBeatsMs = [0,6000,7800,12000,17000,20000,25000,27500,32000,37000,38500,43500,57000,64000]
    export function introFilmTimeMs(realMs: number): number {
        for(let i=1;i<realBeatsMs.length;i++)if(realMs<realBeatsMs[i])
            return filmBeatsMs[i-1]+(realMs-realBeatsMs[i-1])*
                (filmBeatsMs[i]-filmBeatsMs[i-1])/(realBeatsMs[i]-realBeatsMs[i-1])
        return filmBeatsMs[filmBeatsMs.length-1]
    }
    export function introRealTimeMs(filmMs: number): number {
        for(let i=1;i<filmBeatsMs.length;i++)if(filmMs<filmBeatsMs[i])
            return realBeatsMs[i-1]+(filmMs-filmBeatsMs[i-1])*
                (realBeatsMs[i]-realBeatsMs[i-1])/(filmBeatsMs[i]-filmBeatsMs[i-1])
        return introDurationMs
    }
    export let mode = Mode.Intro
    export let previousMode = Mode.Play
    export let ageMs = 0
    export let timeMs = 0
    export let seed = 9137
    let randomState = 9137
    export let rooms: RoomData[] = []
    export let objects: Thing[] = []
    export let brummi = new Robot()
    export let room = 0
    export let playerX = 76
    export let playerY = 60
    export let faceX = 1
    export let faceY = 0
    export let battery = 100
    export let lamp = false
    export let carried = 0
    export let installed = 0
    export let hidden = -1
    export let insertMs = 0
    export let inserting = false
    export let timesNoticed = 0
    export let whistles = 0
    export let whistleFxMs = 0
    export let cooldownMs = 0
    export let bHoldMs = 0
    export let bFired = false
    export let aLatch = false
    export let selected = -1
    export let step = 0
    export let stepAgeMs = 0
    export let progress = 0
    export let messageText = ""
    export let messageTimeMs = 0
    // a small fuse picture in front of the message: Brummi put a fuse back in this room
    export let messageIcon = false
    // lamp warnings wait while a fuse is being inserted; other messages go away when inserting begins
    export let messageWaits = false
    export let reduced = false
    export let muted = false
    export let won = false
    export let cause = ""
    export let menu = 0
    export let beepMs = 0
    export let beepDistance = 999
    export let effect = 0
    export let effectPriority = 0
    export let effectLeftMs = 0
    export let lastNoiseMs = 0
    export let lastNoiseRoom = -1
    export let lastNoiseX = 0
    export let lastNoiseY = 0
    export let transitionMs = 0
    export let warningMs = 0
    export let elapsedMs = 0
    export let touches = 0       // how often Brummi reached the player this shift (with or without a fuse)
    // fuses Brummi took from the player and carried back to their places (the "NOTHING LOST" award depends on it)
    export let fusesTaken = 0
    export let graceMs = 0       // milliseconds left in which no second touch counts
    export let contentMs = 0     // milliseconds left in which Brummi is happy and notices nothing
    export let bag: number[] = [] // object numbers of the carried fuses, oldest first
    export let warningsGiven = 0 // lamp warnings already given (0, 1 or 2)
    // Values to play with: to make the game easier or harder, change these numbers and see what happens.
    export const DRAIN_IDLE = 0.08       // % per second: the helmet lamp always glows a little
    export const DRAIN_BEAM = 0.30       // % per second while the beam is on (instead of DRAIN_IDLE)
    export const BATTERY_GAIN = 35       // % per battery
    export const LAMP_WARN_1 = 30        // the first lamp warning comes at this charge in %
    export const LAMP_WARN_2 = 15        // the second lamp warning comes at this charge in %
    export const FOLLOW_SPEED = 64       // pixels per second while Brummi follows (walking 45, running 92)
    export const FOLLOW_STEP = 2         // extra pixels per second for every installed fuse
    export const FOLLOW_EMPTY = 0        // 1 = Brummi also follows without a carried fuse (in the game it is 0)
    export const CARRY_SPEED = 60        // pixels per second while Brummi carries a fuse back
    export const GRACE_MS = 4000         // no second touch counts for this long (do not set it below 3000)
    // Brummi stays this long in a good mood after he put a fuse back, and he notices nothing
    export const CONTENT_MS = 10000
    // ... and 5 seconds longer for every fuse he already put back earlier in this shift
    export const CONTENT_STEP_MS = 5000
    export const CONTENT_MAX_MS = 30000  // ... but never longer than 30 seconds
    export const LOOK_MS = 5000          // Brummi looks around this long after he lost sight of the player
    export const WHISTLE_STOP_MS = 2500  // Brummi stands still and listens this long after a whistle
    export const WHISTLE_COOLDOWN_MS = 6000
    export const WHISTLE_RANGE = 72      // pixels; in the same room, in any direction, no clear view needed
    export const BEEP_NEAR_MS = 500      // time between two beeps when Brummi is very near
    export const BEEP_STEP_MS = 150      // extra milliseconds for every tile of distance beyond two tiles
    export const WAKE_MS = 4000          // from picking up the first fuse until Brummi leaves the charging dock
    // Fixed rules, not values to play with.
    // A and B count as the pause keys only if they are pressed at most 150 milliseconds apart.
    export const PAUSE_CHORD_MS = 150
    // the studio card "Calliope Hacker presents" begins here (real time in the intro)
    export const CARD_START_MS = 43500
    export const CARD_SKIP_MS = 1500     // on the card, A or B opens the title menu after this time
    export const TRAINING_BATTERY = 40   // charge of the lamp in training step 12, until the battery is taken
    let lastKeys = 0
    let chordMs = 0
    let noiseClockMs = 0
    let insertNoiseClockMs = 0
    let radarClockMs = 0
    let ambienceMs = 0
    let aDownMs = 0
    let bDownMs = 0
    // 12 rooms with 300 tiles each; shared buffers of 16-bit numbers save memory because they avoid thousands
    // of single numbers.
    let queue = control.createBuffer(7200)
    let distances = control.createBuffer(7200)
    let pathDistances = control.createBuffer(600)
    let pathQueue = control.createBuffer(600)
    let pathPitTile = -1
    export let pathBuilds = 0
    let routeRooms: number[] = []
    let routeCache = control.createBuffer(144)
    let routeCacheValid = false
    const RX = [0,1,1,2,2,2,1,3,3,3,4,4]
    const RY = [2,2,1,1,2,3,3,1,2,3,2,3]
    const KINDS = [Kind.Lift,Kind.Corridor,
        Kind.Workshop,Kind.Hall,Kind.Generator,Kind.Workshop,
        Kind.Hall,Kind.Store,Kind.Corridor,Kind.Store,Kind.Corridor,Kind.Dock]
    const NAMES = ["LIFT", "JUNCTION", "WORKSHOP", "CRANE HALL", "GENERATOR", "PUMP ROOM",
        "BASIN", "NORTH STORE", "SHAFT", "SOUTH STORE", "CONVEYOR", "CHARGING DOCK"]
    export const tutorialTitles = [
        "01 / ARRIVAL", "02 / LIGHT", "03 / MOVEMENT", "04 / PICK UP", "05 / POWER",
        "06 / HIDING", "07 / BRUMMI", "08 / SIGHT", "09 / HEARING",
        "10 / WHISTLE", "11 / DISTANCE", "12 / LAMP", "13 / READY"
    ]
    export const tutorialLines = [
        "Go to the yellow target.",
        "Tap B: light on.",
        "A + direction: run 2 sec.",
        "At fuse: stop, press A.",
        "Stop, hold A.",
        "At locker: A, then A.",
        "Meet Brummi.",
        "Tap B: light off.",
        "A + direction: run 1 sec.",
        "Hold B: whistle.",
        "Run to the left target.",
        "Take the battery: A.",
        "Training done. A: start"
    ]
    export function sound(id: number, priority: number) {
        if (priority >= effectPriority || effectLeftMs <= 0) {
            effect = id; effectPriority = priority; effectLeftMs = priority >= 3 ? 350 : 100
        }
    }
    export function message(text: string) {
        messageText = text; messageTimeMs = 2200; messageIcon = false; messageWaits = false
    }
    export function random(max: number): number {
        randomState = (randomState * 1664525 + 1013904223) | 0
        return (randomState & 0x7fffffff) % max
    }
    export function enter(next: Mode) {
        mode = next; ageMs = 0; bHoldMs = 0; bFired = false; insertMs = 0; inserting = false
        aLatch = true; chordMs = 0; menu = 0
        // A key that was already held before the mode changed counts only after it was let go:
        // B does nothing until it is released, and A+B held across the change does not count as the pause keys.
        bFired = true; aDownMs = -1000000; bDownMs = 1000000
    }
    function link(a: number, b: number) {
        let d = RX[b] > RX[a] ? 0
            : RY[b] > RY[a] ? 1 : RX[b] < RX[a] ? 2 : 3
        rooms[a].doors[d] = b; rooms[b].doors[(d + 2) % 4] = a
    }
    export function wall(r: number, x: number, y: number): boolean {
        if (r < 0 || r >= rooms.length || x < 0 || y < 0 || x >= 20 || y >= 15) return true
        return rooms[r].tiles.getUint8(y * 20 + x) == 1
    }
    export function tile(r: number, x: number, y: number): number {
        if (x < 0 || y < 0 || x >= 20 || y >= 15) return 1
        return rooms[r].tiles.getUint8(y * 20 + x)
    }
    function put(r: number, x: number, y: number, value: number) {
        rooms[r].tiles.setUint8(y * 20 + x, value)
    }
    function obstacle(r: number, x: number, y: number, w: number, h: number) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(r, i, j, 1)
    }
    export function makeWorld(value: number) {
        seed = Math.max(1, value & 0x7fffffff); randomState = seed
        rooms = []; objects = []; routeCacheValid = false; pathPitTile = -1; pathBuilds = 0
        for (let i = 0; i < 12; i++) rooms.push(new RoomData(RX[i],
            RY[i], KINDS[i], NAMES[i]))
        link(0,1); link(1,2); link(1,6); link(2,3); link(3,4); link(4,5); link(5,6)
        link(3,7); link(7,8); link(8,9); link(9,5); link(8,10); link(10,11); link(11,9)
        if (random(2)) link(4,8)
        for (let r = 0; r < 12; r++) {
            for (let y = 0; y < 15; y++) for (let x = 0; x < 20; x++)
                put(r,x,y,x == 0 || y == 0 || x == 19 || y == 14 ? 1 : 0)
            if (rooms[r].doors[0] >= 0) {
                put(r,19,7,0)
                put(r,19,8,0)
            }
            if (rooms[r].doors[2] >= 0) { put(r,0,7,0); put(r,0,8,0) }
            if (rooms[r].doors[1] >= 0) {
                put(r,9,14,0)
                put(r,10,14,0)
            }
            if (rooms[r].doors[3] >= 0) {
                put(r,9,0,0)
                put(r,10,0,0)
            }
            if (r != 0 && r != 1) {
                // Two variants (one obstacle is 2 or 3 tiles high); the cross in the middle and the paths to the
                // objects stay clear.
                let variant = random(2)
                obstacle(r,5,4,2,variant ? 3 : 2)
                obstacle(r,13,9,2,2)
                if (KINDS[r] == Kind.Store) {
                    obstacle(r,13,3,2,3)
                    obstacle(r,5,10,2,2)
                }
                if (KINDS[r] == Kind.Workshop)
                    for (let x = 11; x < 14; x++) put(r,x,5,2)
            }
            if (r == 5 || r == 6) for (let x = 3; x < 6; x++) for (let y = 8; y < 11; y++)
                if (!wall(r,x,y)) put(r,x,y,3)
        }
        objects.push(new Thing(0,76,52,Item.Exit))
        objects.push(new Thing(4,76,52,Item.Generator))
        objects.push(new Thing(1,76,60,Item.Fuse))
        let candidates = [2,3,5,6,7,8,9,10]
        for (let i = candidates.length - 1; i > 0; i--) {
            let j = random(i+1); let t=candidates[i]; candidates[i]=candidates[j]; candidates[j]=t
        }
        for (let i = 0; i < 4; i++) objects.push(new Thing(candidates[i], i % 2 ? 124 : 28, 92, Item.Fuse))
        for (let i = 0; i < 4; i++) objects.push(new Thing([7,9,2,5][i],124,28,Item.Battery))
        for (let i = 0; i < 4; i++) objects.push(new Thing([2,5,7,9][i],28,28,Item.Locker))
        for(let a=0;a<12;a++)for(let b=0;b<12;b++)routeCache.setUint8(
            a*12+b,roomRoute(a,b,true))
        routeCacheValid = true
    }
    export function validateWorld(): boolean {
        if(rooms.length!=12)return false
        distances.fill(0)
        let root=9+7*20,read=0,write=1
        queue.setNumber(NumberFormat.UInt16LE,0,root)
        distances.setNumber(NumberFormat.UInt16LE,root*2,1)
        while(read<write) {
            let id=queue.getNumber(NumberFormat.UInt16LE,read++*2)
            for(let d=0;d<4;d++) {
                let n=neighbor(id,d)
                if(n>=0 && distances.getNumber(NumberFormat.UInt16LE,n*2)==0) {
                    distances.setNumber(NumberFormat.UInt16LE,n*2,1)
                    queue.setNumber(NumberFormat.UInt16LE,write++*2,n)
                }
            }
        }
        for(let r=0;r<12;r++)for(let t=0;t<300;t++) {
            if(rooms[r].tiles.getUint8(t)!=1
                && distances.getNumber(NumberFormat.UInt16LE,(r*300+t)*2)==0)
                return false
        }
        let fuseRooms=control.createBuffer(12),fuses=0,batteries=0
        for(let i=0;i<objects.length;i++) {
            let o=objects[i]
            if(!canStand(o.room,o.x,o.y))return false
            if(o.kind==Item.Fuse) {
                if(fuseRooms.getUint8(o.room))return false
                fuseRooms.setUint8(o.room,1)
                fuses++
            }
            if(o.kind==Item.Battery)batteries++
        }
        return fuses==5 && batteries==4 && canStand(11,116,60)
    }
    export function start(value: number, tutorial: boolean) {
        makeWorld(value)
        // Every finished mine is checked. If a tile or an object cannot be reached, the next mine is tried
        // (at most 49 times).
        let tries = 0
        while (!validateWorld() && tries < 49) { tries++; makeWorld(value + tries) }
        if (!validateWorld()) makeWorld(9137)
        Night.invalidateArt()
        room = 0; playerX = 76; playerY = 76; faceX = 1; faceY = 0
        battery = 100; lamp = false; carried = 0; installed = 0; hidden = -1
        cooldownMs = 0; whistleFxMs = 0; timesNoticed = 0
        whistles = 0; timeMs = 0; messageIcon = false; messageWaits = false
        touches = 0; fusesTaken = 0; graceMs = 0; contentMs = 0; bag = []; warningsGiven = 0
        brummi = new Robot(); messageText = ""; messageTimeMs = 0; beepDistance = 999
        radarClockMs = 0; noiseClockMs = 0; insertNoiseClockMs = 0; beepMs = 0; warningMs = 0
        step = 0; progress = 0; stepAgeMs = 0; won = false; cause = ""
        lastNoiseMs = 0; lastNoiseRoom = -1; transitionMs = 0; lastKeys = 0
        effect = 0; effectPriority = 0; effectLeftMs = 0; selected = -1; ambienceMs = 0
        if (tutorial) {
            // Training is kept apart: its fuse, battery and Brummi's behavior never get into a real shift.
            // The generator and the locker stand at y = 32, below the lesson line (the training bar ends at y = 23).
            objects = [new Thing(0,116,44,Item.Fuse),new Thing(0,76,32,Item.Generator),
                new Thing(0,28,32,Item.Locker)]
            rooms[0].doors[0] = -1; put(0,19,7,1); put(0,19,8,1)
        }
        rooms[0].visited = true
        enter(tutorial ? Mode.Tutorial : Mode.Play)
        if(tutorial)sound(21,2)
    }
    export function sight(r: number, ax: number,
        ay: number, bx: number, by: number): boolean {
        let x = Math.floor(ax/8), y = Math.floor(ay/8),
            targetCol = Math.floor(bx/8), targetRow = Math.floor(by/8)
        let dx = Math.abs(targetCol-x), dy = -Math.abs(targetRow-y),
            stepX = x<targetCol ? 1 : -1, stepY = y<targetRow ? 1 : -1
        let err = dx + dy
        for (let n = 0; n < 40; n++) {
            if (x == targetCol && y == targetRow) return true
            if (wall(r,x,y)) return false
            let e = 2*err
            if (e >= dy) { err += dy; x += stepX }
            if (e <= dx) { err += dx; y += stepY }
        }
        return false
    }
    export function cone(ax: number, ay: number, dx: number, dy: number,
        bx: number, by: number, range: number, cosine: number): boolean {
        let vx = bx-ax, vy=by-ay,
            distance = Math.sqrt(vx*vx+vy*vy)
        return distance <= range && (distance < 1 || (vx*dx+vy*dy) / distance >= cosine)
    }
    export function visible(x: number, y: number): boolean {
        let near = (x-playerX)*(x-playerX)+(y-playerY)*(y-playerY) <= 144
        if (hidden >= 0)
            return Math.abs(y-playerY) < 8 && Math.abs(x-playerX)<64 && sight(room,playerX,playerY,x,y)
        return (near || lamp && cone(playerX,playerY,faceX,faceY,x,y,64,0.866))
            && sight(room,playerX,playerY,x,y)
    }
    export function seesPlayer(): boolean {
        if (brummi.state == Bot.Dock
            || brummi.state == Bot.Listen || brummi.state == Bot.Carry
            || graceMs > 0 || contentMs > 0 || hidden >= 0
            || room == 0 && mode != Mode.Tutorial || brummi.room != room) return false
        if (!sight(room,brummi.x,brummi.y,playerX,playerY)) return false
        let dx = playerX-brummi.x, dy = playerY-brummi.y
        if (dx*dx+dy*dy <= 144) return true
        return cone(brummi.x,brummi.y,brummi.dx,brummi.dy,playerX,playerY,lamp ? 72 : 24,0.819)
    }
    function neighbor(id: number, d: number): number {
        let r = Math.floor(id/300), t = id%300,
            x=t%20, y=Math.floor(t/20)
        let neighborCol=x+(d==0 ? 1 : d==2 ? -1 : 0),
            neighborRow=y+(d==1 ? 1 : d==3 ? -1 : 0)
        if (neighborCol<0 || neighborCol>=20 || neighborRow<0 || neighborRow>=15) {
            r = rooms[r].doors[d]
            if (r<0) return -1
            neighborCol = neighborCol<0 ? 19 : neighborCol>=20 ? 0 : neighborCol
            neighborRow=neighborRow<0 ? 14 : neighborRow>=15 ? 0 : neighborRow
        }
        if (wall(r,neighborCol,neighborRow)) return -1
        return r*300+neighborRow*20+neighborCol
    }
    // Measures the distance over walkable tiles, exactly, and only up to the limit given as the parameter
    // (at most 12 tiles).
    export function acoustic(r: number, x: number, y: number,
        otherRoom: number, ox: number, oy: number, limit: number): number {
        let start = r*300+Math.floor(y/8)*20+Math.floor(x/8)
        let end = otherRoom*300+Math.floor(oy/8)*20+Math.floor(ox/8)
        distances.fill(0)
        let read=0,write=1; queue.setNumber(NumberFormat.UInt16LE,0,start)
        distances.setNumber(NumberFormat.UInt16LE,start*2,1)
        while (read<write) {
            let id=queue.getNumber(NumberFormat.UInt16LE,read++*2),
                value=distances.getNumber(NumberFormat.UInt16LE,id*2)
            if (id==end) return value-1
            if (value>limit) continue
            for (let d=0;d<4;d++) {
                let next=neighbor(id,d)
                if (next>=0 && distances.getNumber(NumberFormat.UInt16LE,next*2)==0) {
                    distances.setNumber(NumberFormat.UInt16LE,next*2,value+1)
                    queue.setNumber(NumberFormat.UInt16LE,write++*2,next)
                }
            }
        }
        return 999
    }
    export function noise(radius: number, x: number, y: number, sourceRoom: number) {
        if (tile(sourceRoom,Math.floor(x/8),Math.floor(y/8)) == 3) radius /= 2
        lastNoiseMs=450; lastNoiseX=x; lastNoiseY=y; lastNoiseRoom=sourceRoom
        if (brummi.state == Bot.Dock
            || brummi.state == Bot.Listen || brummi.state == Bot.Carry
            || contentMs > 0 || mode == Mode.Tutorial) return
        if (acoustic(sourceRoom,x,y,brummi.room,brummi.x,brummi.y,radius) <= radius) {
            brummi.pauseMs=0;brummi.targetRoom=sourceRoom
            brummi.targetX=x; brummi.targetY=y; brummi.routeAgeMs=1000
            if (brummi.state != Bot.Follow) {
                brummi.state=Bot.Curious
                brummi.timerMs=0
            }
        }
    }
    export function roomRoute(from: number, to: number, allowLift: boolean): number {
        if (from == to || !allowLift && to == 0) return from
        if (routeCacheValid) return routeCache.getUint8(from*12+to)
        let parents: number[] = []; routeRooms = []
        for(let i=0;i<rooms.length;i++) parents.push(-2)
        parents[from]=-1; routeRooms.push(from)
        for (let read=0;read<routeRooms.length;read++) {
            let r=routeRooms[read]
            for(let d=0;d<4;d++) {
                let n=rooms[r].doors[d]
                if(n<0 || !allowLift && n==0 || parents[n]!=-2) continue
                parents[n]=r; routeRooms.push(n)
            }
        }
        if(parents[to]==-2) return from
        let next=to
        while(parents[next]>=0 && parents[next]!=from) next=parents[next]
        return next
    }
    function patrol() {
        brummi.state=Bot.Patrol; brummi.timerMs=0; brummi.observedLocker=-1
        let dest=1+random(11)
        if(dest==brummi.room) dest=dest%11+1
        brummi.targetRoom=dest; brummi.targetX=76; brummi.targetY=76; brummi.routeAgeMs=1000
    }
    function follow() {
        if(brummi.state!=Bot.Follow) { timesNoticed++; sound(5,4) }
        brummi.state=Bot.Follow; brummi.lostMs=0; brummi.pauseMs=0
        brummi.targetRoom=room; brummi.targetX=playerX; brummi.targetY=playerY
    }
    // Brummi only wants fuses: if the player carries none, he does not follow.
    function wantsFuse(): boolean { return carried > 0 || FOLLOW_EMPTY > 0 }
    // Brummi reached the player. He takes the fuse the player picked up last and carries it back to its place.
    // Fuses in the generator stay there. text is the message for the message line; if it is empty, the usual
    // message is shown.
    function tidy(text: string) {
        touches++; graceMs = GRACE_MS
        brummi.exposureMs = 0; brummi.observedLocker = -1; brummi.lostMs = 0
        if (carried > 0 && bag.length > 0) {
            let i = bag.pop(); carried--; fusesTaken++; inserting = false; insertMs = 0
            brummi.state = Bot.Carry; brummi.cargo = i; brummi.pauseMs = 600
            brummi.targetRoom = objects[i].room; brummi.targetX = objects[i].x
            brummi.targetY = objects[i].y; brummi.routeAgeMs = 1000
            message(text == "" ? "BRUMMI TAKES 1 FUSE!" : text); sound(25, 4)
        } else touchEmpty()
    }
    // A touch without a carried fuse: nothing happens, Brummi drives on and stays happy for a while.
    function touchEmpty() {
        patrol(); contentMs = CONTENT_MS; brummi.pauseMs = 800
        message("NOTHING TO TIDY UP."); sound(26, 3)
    }
    // Brummi puts the carried fuse back where it was found, waits and starts a new patrol. For every fuse he put back
    // earlier in this shift he stays happy a little longer (slow players do not lose the same fuse again and again).
    // The message names the room where the fuse lies again (fuse picture and room name), unless a lamp
    // warning is showing.
    function drop() {
        if (brummi.cargo >= 0) {
            let o = objects[brummi.cargo]
            o.taken = false
            if (!(messageTimeMs > 0 && messageWaits)) {
                message(rooms[o.room].name)
                messageIcon = true
            }
        }
        brummi.cargo = -1; patrol(); brummi.pauseMs = 1500; sound(28, 2)
        contentMs = Math.min(CONTENT_MAX_MS,
            CONTENT_MS + CONTENT_STEP_MS * Math.max(0, fusesTaken - 1))
    }
    function brummiPath(targetX: number, targetY: number) {
        let startCol=Math.floor(brummi.x/8),startRow=Math.floor(brummi.y/8),
            goalCol=Math.floor(targetX/8),goalRow=Math.floor(targetY/8)
        let targetPitTile=brummi.room*300+goalRow*20+goalCol
        if(pathPitTile!=targetPitTile) {
        pathPitTile=targetPitTile;pathBuilds++;pathDistances.fill(0)
        let read=0,write=1,targetTile=goalRow*20+goalCol
        pathQueue.setNumber(NumberFormat.UInt16LE,0,targetTile)
        pathDistances.setNumber(NumberFormat.UInt16LE,targetTile*2,1)
        while(read<write) {
            let id=pathQueue.getNumber(NumberFormat.UInt16LE,read++*2),
                x=id%20,y=Math.floor(id/20)
            let value=pathDistances.getNumber(NumberFormat.UInt16LE,id*2)
            for(let d=0;d<4;d++) {
                let neighborCol=x+(d==0?1:d==2?-1:0),
                    neighborRow=y+(d==1?1:d==3?-1:0),next=neighborRow*20+neighborCol
                if(!wall(brummi.room,neighborCol,neighborRow)
                    && pathDistances.getNumber(NumberFormat.UInt16LE,next*2)==0) {
                    pathDistances.setNumber(NumberFormat.UInt16LE,next*2,value+1)
                    pathQueue.setNumber(NumberFormat.UInt16LE,write++*2,next)
                }
            }
        }
        }
        let best=pathDistances.getNumber(NumberFormat.UInt16LE,(startRow*20+startCol)*2)
        brummi.routeX=brummi.x; brummi.routeY=brummi.y
        if(startCol==goalCol && startRow==goalRow) { brummi.routeX=targetX;brummi.routeY=targetY;return }
        for(let d=0;d<4;d++) {
            let neighborCol=startCol+(d==0?1:d==2?-1:0),
                neighborRow=startRow+(d==1?1:d==3?-1:0)
            if(wall(brummi.room,neighborCol,neighborRow)) continue
            let v=pathDistances.getNumber(NumberFormat.UInt16LE,(neighborRow*20+neighborCol)*2)
            if(v>0 && (v<best || best==0)) {
                best=v
                brummi.routeX=neighborCol*8+4
                brummi.routeY=neighborRow*8+4
            }
        }
    }
    function moveBrummi(dt: number) {
        if(brummi.pauseMs>0) {brummi.pauseMs-=dt;return}
        let targetX=brummi.targetX,targetY=brummi.targetY,next=brummi.room,dir=-1
        if(brummi.targetRoom!=brummi.room) {
            next=roomRoute(brummi.room,brummi.targetRoom,false)
            if(next==brummi.room) {
                if(brummi.state==Bot.Carry)drop()
                else patrol()
                return
            }
            for(let d=0;d<4;d++) if(rooms[brummi.room].doors[d]==next)
                dir=d
            targetX=dir==0?156:dir==2?4:76;targetY=dir==1?116:dir==3?4:60
        }
        brummi.routeAgeMs+=dt
        let pitTile=Math.floor(targetX/8)+Math.floor(targetY/8)*20+brummi.room*300
        if(brummi.routeAgeMs>=200 || Math.abs(brummi.x-brummi.routeX)+Math.abs(brummi.y-brummi.routeY)<1
            || brummi.routePitTile!=pitTile) {
            brummiPath(targetX,targetY);brummi.routeAgeMs=0;brummi.routePitTile=pitTile
        }
        let dx=brummi.routeX-brummi.x,dy=brummi.routeY-brummi.y,dist=Math.sqrt(dx*dx+dy*dy)
        let speed=brummi.state==Bot.Follow?FOLLOW_SPEED+installed*FOLLOW_STEP:
            brummi.state==Bot.Carry?CARRY_SPEED
                :brummi.state==Bot.Patrol?30:brummi.state==Bot.Look?50:45
        if(dist>0.1) {
            brummi.dx=dx/dist;brummi.dy=dy/dist
            let travel=Math.min(dist,speed*dt/1000)
            brummi.x+=brummi.dx*travel;brummi.y+=brummi.dy*travel
        }
        if(dir>=0 && Math.abs(brummi.x-targetX)+Math.abs(brummi.y-targetY)<2) {
            brummi.room=next;brummi.x=dir==0?4:dir==2?156:76
            brummi.y=dir==1?4:dir==3?116:60;brummi.routeAgeMs=1000
        } else if(dir<0 && Math.abs(brummi.x-targetX)+Math.abs(brummi.y-targetY)<3) {
            if(brummi.state==Bot.Patrol) {patrol();brummi.pauseMs=installed>=2?1000:2000}
            else if(brummi.state==Bot.Curious) {
                brummi.timerMs+=dt
                if(brummi.timerMs>=3000)patrol()
            }
            else if(brummi.state==Bot.Carry) drop()
        }
    }
    function updateBrummi(dt: number) {
        if(brummi.state==Bot.Dock) {
            if(brummi.wakeMs>0) {
                brummi.wakeMs-=dt
                if(brummi.wakeMs<=0)patrol()
            }
            return
        }
        if(brummi.state==Bot.Listen) {
            brummi.timerMs-=dt
            if(brummi.timerMs<=0) {
                brummi.state=Bot.Curious
                brummi.timerMs=0
                brummi.routeAgeMs=1000
            }
            return
        }
        // Carrying a fuse back: Brummi only drives and notices nothing.
        if(brummi.state==Bot.Carry) {moveBrummi(dt);return}
        let seen=seesPlayer(),wants=wantsFuse()
        if(seen && wants) {
            brummi.exposureMs+=dt
            let dx=playerX-brummi.x,dy=playerY-brummi.y
            if(brummi.exposureMs>=600 || dx*dx+dy*dy<=144 || brummi.state==Bot.Follow)
                follow()
        } else brummi.exposureMs=0
        // Nothing left to tidy (for example because the last fuse is in the generator): Brummi stops following at once.
        if(!wants && (brummi.state==Bot.Follow || brummi.state==Bot.Look))
            patrol()
        // Hide and seek: Brummi saw the player step into the locker and finds the player there.
        if(brummi.observedLocker==hidden && hidden>=0 && brummi.room==room
            && Math.abs(brummi.x-playerX)+Math.abs(brummi.y-playerY)<10) {
            hidden=-1;tidy("FOUND YOU! TIDY-UP TIME!");return
        }
        if(brummi.state==Bot.Follow && !seen) {
            brummi.lostMs+=dt
            if(brummi.lostMs>=2000) {brummi.state=Bot.Look;brummi.timerMs=LOOK_MS}
        }
        if(brummi.state==Bot.Look) {
            brummi.timerMs-=dt
            if(brummi.timerMs<=0) patrol()
            else if(brummi.room==brummi.targetRoom
                && Math.abs(brummi.x-brummi.targetX)+Math.abs(brummi.y-brummi.targetY)<5) {
                let x=Math.max(12,Math.min(148,brummi.targetX+random(65)-32)),
                    y=Math.max(20,Math.min(100,brummi.targetY+random(65)-32))
                if(canStand(brummi.room,x,y)) {brummi.targetX=x;brummi.targetY=y;brummi.routeAgeMs=1000}
            }
        }
        // Patches of light only make Brummi curious; he never learns where the light comes from.
        if(lamp && contentMs<=0 && brummi.room==room && room!=0
            && brummi.state==Bot.Patrol && !seen) {
            for(let n=16;n<=64;n+=16) {
                let x=playerX+faceX*n,y=playerY+faceY*n
                if(!wall(room,Math.floor(x/8),Math.floor(y/8)) && visible(x,y)
                    && cone(brummi.x,brummi.y,brummi.dx,brummi.dy,x,y,72,0.819)
                    && sight(room,brummi.x,brummi.y,x,y)) {
                    brummi.pauseMs=0;brummi.state=Bot.Curious;brummi.targetRoom=room
                    brummi.targetX=x;brummi.targetY=y;brummi.timerMs=0;break
                }
            }
        }
        moveBrummi(dt)
        if(graceMs<=0 && contentMs<=0 && hidden<0 && brummi.room==room && room!=0
            && Math.abs(brummi.x-playerX)<6 && Math.abs(brummi.y-playerY)<6) tidy("")
    }
    export function findObject(): number {
        if(hidden>=0)return hidden
        let best=-1,distance=100000
        for(let i=0;i<objects.length;i++) {
            let o=objects[i]
            if(o.room!=room || o.taken)continue
            let dx=o.x-playerX,dy=o.y-playerY,d=dx*dx+dy*dy
            // The generator picture is 19 x 17 pixels (the box is 17 x 14). The player should be able to insert a fuse
            // at the panel without covering the picture or looking exactly at its center.
            let reach=o.kind==Item.Generator ? 18 : 11
            let facing=o.kind==Item.Generator || d<=25 || dx*faceX+dy*faceY>=0
            if(d<reach*reach && d<distance && facing
                && sight(room,playerX,playerY,o.x,o.y)) {
                distance=d
                best=i
            }
        }
        return best
    }
    function interact() {
        if(hidden>=0) {
            hidden=-1;noise(4,playerX,playerY,room);sound(3,2)
            if(mode==Mode.Tutorial && step==5 && progress>0)advance()
            return
        }
        selected=findObject()
        if(selected<0)return
        // From training step 7 on, A only picks up the battery of step 12.
        if(mode==Mode.Tutorial && step>=6 && !(step==11 && objects[selected].kind==Item.Battery))return
        let o=objects[selected]
        if(mode==Mode.Tutorial && (step<3 || step==3 && o.kind!=Item.Fuse
            || step==4 && o.kind!=Item.Generator || step==5 && o.kind!=Item.Locker))return
        if(o.kind==Item.Fuse) {
            if(carried>=3) {message("BAG FULL  3/3");return}
            o.taken=true;carried++;bag.push(selected);sound(2,2)
            if(brummi.state==Bot.Dock && brummi.wakeMs==0) {
                brummi.wakeMs=WAKE_MS;message("BEEP! BRUMMI IS AWAKE.");sound(7,3)
            }
            if(mode==Mode.Tutorial && step==3)advance()
        } else if(o.kind==Item.Battery) {
            if(battery>=100) {message("BATTERY FULL");return}
            battery=Math.min(100,battery+BATTERY_GAIN);warningsGiven=0
            o.taken=true;sound(2,2);message("BATTERY COLLECTED")
            if(mode==Mode.Tutorial && step==11)advance()
        } else if(o.kind==Item.Locker) {
            let observed=seesPlayer()
            hidden=selected;playerX=o.x;playerY=o.y;lamp=false
            // Hide and seek only works with a carried fuse; without one Brummi just looks over ("?")
            // and counts nothing.
            if(observed && wantsFuse()) {
                follow()
                brummi.observedLocker=hidden
                brummi.routeAgeMs=1000
            }
            else if(observed) {
                brummi.pauseMs=0;brummi.state=Bot.Curious;brummi.targetRoom=room
                brummi.targetX=playerX;brummi.targetY=playerY;brummi.timerMs=0;brummi.routeAgeMs=1000
            }
            noise(4,playerX,playerY,room);sound(3,2)
            if(mode==Mode.Tutorial && step==5)progress=1
        } else if(o.kind==Item.Generator) {
            if(carried<=0)message("FIND FUSES")
            else {inserting=true;insertMs=0;insertNoiseClockMs=500;if(!messageWaits)messageTimeMs=0}
        } else message(installed<5?"NO POWER. NEED 5 FUSES.":"LIFT READY")
    }
    function advance() {
        step++;stepAgeMs=0;progress=0;sound(2,2)
        if(step>=6 && step<=9) {
            // Each safe demonstration is set up exactly once, when the player enters.
            playerX=92;playerY=76;faceX=1;faceY=0;hidden=-1;lamp=true
            brummi.room=0;brummi.x=124;brummi.y=76;brummi.dx=-1;brummi.dy=0
            brummi.state=Bot.Patrol;brummi.exposureMs=0;brummi.observedLocker=-1
            battery=100;cooldownMs=0;bHoldMs=0;bFired=false
            carried=1 // practice fuse: Brummi wants fuses (the training never takes it away)
        }
        if(step==8)lamp=false
        if(step==11) {
            // Lamp lesson: the training battery only appears now, where Brummi stood; he moves aside.
            carried=0;battery=TRAINING_BATTERY;cooldownMs=0
            objects.push(new Thing(0,124,76,Item.Battery))
            brummi.state=Bot.Patrol;brummi.x=144;brummi.y=92;brummi.dx=-1;brummi.dy=0
        }
    }
    function doWhistle() {
        if(hidden>=0) {message("UNAVAILABLE IN LOCKER");return}
        if(cooldownMs>0) {message("CATCH YOUR BREATH FIRST!");return}
        // Brummi is carrying a fuse back and hears nothing: the whistle would do nothing, so it costs nothing,
        // and a short tone says so.
        if(brummi.state==Bot.Carry) {sound(26,3);return}
        // Whistling costs no power, needs no aiming and goes around corners (see acoustic).
        whistles++;whistleFxMs=300;cooldownMs=WHISTLE_COOLDOWN_MS;inserting=false;insertMs=0
        sound(4,3)
        let wx=brummi.x-playerX,wy=brummi.y-playerY
        if(brummi.state==Bot.Dock || brummi.room!=room
            || wx*wx+wy*wy>WHISTLE_RANGE*WHISTLE_RANGE)
            noise(6,playerX,playerY,room)
        else {
            brummi.state=Bot.Listen
            brummi.timerMs=WHISTLE_STOP_MS;brummi.observedLocker=-1
            brummi.targetRoom=room;brummi.targetX=playerX
            brummi.targetY=playerY;brummi.exposureMs=0;sound(8,4)
            if(mode==Mode.Tutorial && step==9)advance()
        }
    }
    function canStand(r: number,x: number,y: number): boolean {
        return !wall(r,Math.floor((x-2)/8),Math.floor((y-2)/8))
            && !wall(r,Math.floor((x+2)/8),Math.floor((y-2)/8))
            && !wall(r,Math.floor((x-2)/8),Math.floor((y+2)/8))
            && !wall(r,Math.floor((x+2)/8),Math.floor((y+2)/8))
    }
    function movePlayer(dx: number,dy: number) {
        let newX=playerX+dx,newY=playerY+dy,d=-1
        if(newX<3 && rooms[room].doors[2]>=0 && playerY>=58 && playerY<=70)d=2
        if(newX>157 && rooms[room].doors[0]>=0 && playerY>=58 && playerY<=70)d=0
        if(newY<3 && rooms[room].doors[3]>=0 && playerX>=74 && playerX<=86)d=3
        if(newY>117 && rooms[room].doors[1]>=0 && playerX>=74 && playerX<=86)d=1
        if(d>=0) {
            let dest=rooms[room].doors[d], destX=d==0?4:d==2?156:playerX,
                destY=d==1?4:d==3?116:playerY
            room=dest;playerX=destX;playerY=destY
            rooms[room].visited=true;transitionMs=600;radarClockMs=200
            if(room==0 && installed==5)finish(true,"")
            return
        }
        if(canStand(room,newX,playerY))playerX=newX
        if(canStand(room,playerX,newY))playerY=newY
    }
    export function finish(victory: boolean,reason: string) {
        won=victory;cause=reason;enter(Mode.Result);sound(victory?9:6,5)
    }
    // Menu button: opens the pause menu and closes it again. From the training the pointer
    // starts on "SKIP TRAINING" (one press of A skips it).
    export function pause() {
        if(mode==Mode.Pause) {enter(previousMode);return}
        if(mode==Mode.Play || mode==Mode.Tutorial) {
            previousMode=mode;enter(Mode.Pause);if(previousMode==Mode.Tutorial)menu=1
        }
    }
    export function update(dt: number,keys: number) {
        dt=Math.min(50,Math.max(0,dt));ageMs+=dt;elapsedMs+=dt
        let pressed=keys & ~lastKeys,released=lastKeys & ~keys;lastKeys=keys
        if(pressed&16)aDownMs=elapsedMs
        if(pressed&32)bDownMs=elapsedMs
        effectLeftMs-=dt;if(effectLeftMs<=0)effectPriority=0
        if(mode==Mode.Intro) {
            // A or B: first to the card, then from the card (after 1.5 seconds) to the title menu. In the first 0.5
            // seconds a press does not count.
            if(ageMs>=introDurationMs)enter(Mode.Title)
            else if(ageMs>500 && (pressed&48)!=0) {
                if(ageMs<CARD_START_MS)ageMs=CARD_START_MS
                else if(ageMs>=CARD_START_MS+CARD_SKIP_MS)enter(Mode.Title)
            }
            return
        }
        // Menus ignore presses for the first 500 milliseconds after they open, so mashing A does not land
        // somewhere by accident.
        if((mode==Mode.Title || mode==Mode.TutorialChoice) && ageMs<500)return
        if(mode==Mode.Title) {
            if(pressed&1 || pressed&4) {menu=(menu+3)%4;sound(1,1)}
            if(pressed&2 || pressed&8) {menu=(menu+1)%4;sound(1,1)}
            if(pressed&16) {
                if(menu==0)enter(Mode.TutorialChoice)
                if(menu==1)start(seed,true)
                if(menu==2)reduced=!reduced
                if(menu==3)muted=!muted
            }
            return
        }
        if(mode==Mode.TutorialChoice) {
            if(pressed&16)start(seed,true)
            else if(pressed&32)start(seed,false)
            return
        }
        if(mode==Mode.Pause) {
            if(pressed&1 || pressed&4)menu=(menu+3)%4
            if(pressed&2 || pressed&8)menu=(menu+1)%4
            if(pressed&16) {
                if(menu==0)enter(previousMode)
                else if(menu==1) {if(previousMode==Mode.Tutorial)start(seed,false);else reduced=!reduced}
                else if(menu==2)muted=!muted
                else enter(Mode.Title)
            }
            return
        }
        if(mode==Mode.Result) {
            if(ageMs>600 && pressed&16)start(seed,false)
            else if(ageMs>600 && pressed&32)start((seed+7919)%99999+1,false)
            return
        }
        // The pause keys A+B count only if both keys went down together and are held for 0.9 seconds; otherwise B
        // whistles while A runs.
        let pausing=(keys&48)==48 && Math.abs(aDownMs-bDownMs)<=PAUSE_CHORD_MS
        if(pausing) {
            chordMs+=dt;inserting=false;insertMs=0;bHoldMs=0;bFired=true;aLatch=true
            if(chordMs>=900) {pause();return}
        } else chordMs=0
        // In the training the lamp stays full; only the lamp lesson (step 12) shows a weak lamp (40 percent).
        if(mode==Mode.Tutorial && step<11)battery=100
        if(!(keys&16))aLatch=false
        timeMs+=dt;whistleFxMs=Math.max(0,whistleFxMs-dt);cooldownMs=Math.max(0,cooldownMs-dt)
        graceMs=Math.max(0,graceMs-dt);contentMs=Math.max(0,contentMs-dt)
        // While a fuse is inserted, the bottom line shows a progress bar.
        // A lamp warning waits until inserting is done.
        if(!inserting || !messageWaits)messageTimeMs=Math.max(0,messageTimeMs-dt)
        lastNoiseMs=Math.max(0,lastNoiseMs-dt);transitionMs=Math.max(0,transitionMs-dt)
        let dx=(keys&2?1:0)-(keys&1?1:0),dy=(keys&8?1:0)-(keys&4?1:0)
        let moving=dx!=0 || dy!=0, running=moving && (keys&16)!=0
        if(moving && hidden<0) {
            let length=Math.sqrt(dx*dx+dy*dy);faceX=dx/length;faceY=dy/length
            let travel=(running?92:45)*dt/1000
            let previousX=playerX,previousY=playerY,previousRoom=room
            movePlayer(faceX*travel,faceY*travel)
            let moved=previousX!=playerX || previousY!=playerY || previousRoom!=room
            noiseClockMs=moved?noiseClockMs+dt:0
            if(noiseClockMs>=400) {
                noiseClockMs=0
                noise(tile(room,Math.floor(playerX/8),Math.floor(playerY/8))==2?8:running?10:3,
                    playerX,playerY,room)
                if(moved)sound(running?11:20,1)
            }
            if(mode==Mode.Tutorial && (step==2 || step==8) && running && moved)progress+=dt
        }
        if((mode as number)==Mode.Result)return
        if(!pausing && pressed&16 && !moving && !aLatch) {aLatch=true;interact()}
        if(inserting) {
            if(!(keys&16) || moving || hidden>=0) {inserting=false;insertMs=0}
            else {
                insertMs+=dt;insertNoiseClockMs+=dt
                if(insertNoiseClockMs>=500) {
                    insertNoiseClockMs=0
                    noise(12,playerX,playerY,room)
                    sound(3,1)
                }
                if(insertMs>=3000) {
                    installed++;carried--;bag.shift();insertMs=0;inserting=false;sound(12,3)
                    if(mode==Mode.Tutorial && step==4)advance()
                    else if(installed==5) {
                        message("POWER! BACK TO THE LIFT!")
                        if(brummi.state!=Bot.Follow
                            && brummi.state!=Bot.Listen) {
                            brummi.state=Bot.Curious;brummi.targetRoom=4;brummi.targetX=76
                            brummi.targetY=52;brummi.timerMs=0;brummi.routeAgeMs=1000
                        }
                    }
                }
            }
        }
        if(!pausing && keys&32) {bHoldMs+=dt;if(bHoldMs>=350 && !bFired) {bFired=true;doWhistle()}}
        if(released&32) {
            if(!bFired && bHoldMs>0 && hidden<0) {lamp=!lamp;sound(1,1)}
            bHoldMs=0;bFired=false
        }
        if(!(keys&32) && !(released&32)) {bHoldMs=0;bFired=false}
        // The lamp is the clock of the shift: when it is empty, the shift is over.
        // With all five fuses in the generator the lamp uses no power any more, because then the generator gives light.
        if(mode==Mode.Play) {
            if(installed<5)battery=Math.max(0,battery-(lamp?DRAIN_BEAM:DRAIN_IDLE)*dt/1000)
            if(battery<=LAMP_WARN_1 && warningsGiven<1) {
                warningsGiven=1;message("LAMP IS GETTING LOW.");messageWaits=true;sound(27,2)
            }
            if(battery<=LAMP_WARN_2 && warningsGiven<2) {
                warningsGiven=2;message("LAMP ALMOST OUT! BATTERY?");messageWaits=true;sound(27,3)
            }
            if(battery<=0) {lamp=false;finish(false,"THE LAMP IS EMPTY.");return}
        }
        selected=findObject()
        if(mode==Mode.Tutorial) {
            stepAgeMs+=dt
            if(brummi.state==Bot.Listen) {
                brummi.timerMs=Math.max(0,brummi.timerMs-dt)
                if(brummi.timerMs==0)brummi.state=Bot.Patrol
            }
            // Step 7: Brummi beeps from a fixed distance of 4 tiles, and the antenna in the dashboard blinks.
            warningMs=Math.max(0,warningMs-dt)
            if(step==6) {
                beepDistance=4;beepMs-=dt
                if(beepMs<=0) {
                    beepMs=BEEP_NEAR_MS+2*BEEP_STEP_MS
                    warningMs=160
                    sound(13,2)
                }
            }
            else beepDistance=999
            if(step==0 && Math.abs(playerX-116)+Math.abs(playerY-76)<10)advance()
            else if(step==1 && lamp)advance()
            else if(step==2 && progress>=2000)advance()
            else if(step==6 && stepAgeMs>700 && pressed&16)advance()
            else if(step==7) {
                brummi.exposureMs=lamp?Math.min(600,stepAgeMs):0
                if(!lamp && stepAgeMs>300)advance()
            } else if(step==8) {
                if(lastNoiseMs>0)brummi.state=Bot.Curious
                if(progress>=1000)advance()
            } else if(step==10) {
                if(playerX<48 && playerY>60 && playerY<90)advance()
            } else if(step==12 && stepAgeMs>700 && pressed&16)start(seed,false)
            return
        }
        updateBrummi(dt)
        radarClockMs+=dt
        if(radarClockMs>=200) {
            radarClockMs=0
            beepDistance=brummi.state==Bot.Dock?999
                :acoustic(room,playerX,playerY,brummi.room,brummi.x,brummi.y,12)
        }
        warningMs=Math.max(0,warningMs-dt);beepMs-=dt
        if(beepDistance<=12 && beepMs<=0) {
            beepMs=BEEP_NEAR_MS+Math.max(0,beepDistance-2)*BEEP_STEP_MS
            warningMs=160;sound(13,2)
        }
        ambienceMs+=dt
        if(ambienceMs>=14000) {ambienceMs=0;sound(14,1)}
    }
}
