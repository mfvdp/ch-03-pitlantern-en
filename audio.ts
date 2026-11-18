// Friendly music and quiet sounds of the mine; every voice fades out at the end.
// Commands for the Arcade mixer: 1 = triangle, 3 = sine, 18 = noise (WaveShape.Noise, a cycle noise of the synthesizer;
// white noise would be 5). The volumes go from 0 to 1023.
// Rule against startling the player: a peak above 400 needs an attack of at least 100 milliseconds;
// drums stay at 400 or below.
namespace NightAudio {
    let sounds: Buffer[] = []
    let lengthsMs: number[] = []
    let busyUntilMs = 0
    let priority = 0
    let previousMode = -1
    let previousAgeMs = -1
    let silenced = false
    let introCue = 0
    // Cuts, story points and the studio card share one timeline (film time).
    // Wind, latch, cage, sparks, soft power-off, beep, rising beeps, monitor on,
    // studio swell, little bell, signature chord, title.
    const cueTimesMs = [700, 5300, 7200, 10800, 15500, 19000, 21300, 23400, 25600, 26950, 28500, 34600]
    const cueSounds = [15, 3, 16, 17, 19, 13, 30, 22, 23, 29, 24, 18]
    let songCue = 0
    // Only the next part of the music is kept in memory.
    let song: Buffer[] = []
    let preparedPart = -1
    // 180 beats per minute: 36 eighth notes per section of six seconds. The picture times stay fixed.
    const songTickMs = 1000 / 6
    // Five voices leave three channels free for the studio signature chord.
    const songTimesMs = [500,6500,12500,18500,24500,30500,36500,42500,48500,54500,60500]
    const songLengthsMs = [6000,6000,6000,6000,6000,6000,6000,6000,6000,6000,3000]
    let atmospheres: Buffer[] = []
    let hum: Buffer[] = []
    let nextAtmosphereMs = 0
    let nextHumMs = 0
    let atmosphereIndex = 0
    let stepWater: Buffer
    let stepMetal: Buffer
    let stepWaterRun: Buffer
    let stepMetalRun: Buffer
    let harmonyLow: Buffer
    let harmonyHigh: Buffer

    function segment(buffer: Buffer, offset: number, wave: number, durationMs: number,
        fromHz: number, toHz: number, fromVolume: number, toVolume: number) {
        buffer.setUint8(offset, wave)
        buffer.setNumber(NumberFormat.UInt16LE, offset + 2, fromHz)
        buffer.setNumber(NumberFormat.UInt16LE, offset + 4, durationMs)
        buffer.setNumber(NumberFormat.UInt16LE, offset + 6, fromVolume)
        buffer.setNumber(NumberFormat.UInt16LE, offset + 8, toVolume)
        buffer.setNumber(NumberFormat.UInt16LE, offset + 10, toHz)
    }
    function envelope(wave: number, fromHz: number, toHz: number,
        peak: number, attackMs: number, durationMs: number): Buffer {
        let data = control.createBuffer(36)
        let middle = Math.round(fromHz + (toHz - fromHz) * attackMs / durationMs)
        segment(data, 0, wave, attackMs, fromHz, middle, 0, peak)
        segment(data, 12, wave, durationMs - attackMs, middle, toHz, peak, 0)
        // The last instruction, with zero, ends the buffer. No tone lasts longer than its cue.
        return data
    }
    function add(wave: number, fromHz: number,
        toHz: number, peak: number, attackMs: number, durationMs: number) {
        sounds.push(envelope(wave, fromHz, toHz, peak, attackMs, durationMs))
        lengthsMs.push(durationMs)
    }
    // A short tune on one channel: groups of three numbers (start pitch, end pitch and length), one peak per note.
    // A start pitch of 0 is a rest. Every note rises from zero and falls back to zero.
    function melody(wave: number, notes: number[], peaks: number[], attackMs: number) {
        let count = notes.length / 3
        let data = control.createBuffer((count * 2 + 1) * 12)
        let totalMs = 0
        for (let i = 0; i < count; i++) {
            let fromHz = notes[i * 3], toHz = notes[i * 3 + 1], noteMs = notes[i * 3 + 2], offset = i * 24
            totalMs += noteMs
            if (fromHz == 0) {
                segment(data, offset, wave, noteMs - 1, 1, 1, 0, 0)
                segment(data, offset + 12, wave, 1, 1, 1, 0, 0)
                continue
            }
            let middle = Math.round(fromHz + (toHz - fromHz) * attackMs / noteMs)
            segment(data, offset, wave, attackMs, fromHz, middle, 0, peaks[i])
            segment(data, offset + 12, wave, noteMs - attackMs, middle, toHz, peaks[i], 0)
        }
        sounds.push(data)
        lengthsMs.push(totalMs)
    }
    function tune(wave: number, notes: number[], peak: number, attackMs: number) {
        let peaks: number[] = []
        for (let i = 0; i < notes.length / 3; i++) peaks.push(peak)
        melody(wave, notes, peaks, attackMs)
    }
    // The studio signature chord is D major, played three times, each time one position higher: each buffer is one
    // voice that climbs from startHz over middleHz to endHz; three voices sound together.
    function signature(startHz: number,middleHz: number,endHz: number,peak: number): Buffer {
        let data=control.createBuffer(84)
        segment(data,0,3,120,startHz,startHz,0,peak)
        segment(data,12,3,530,startHz,startHz,peak,0)
        segment(data,24,3,120,middleHz,middleHz,0,peak)
        segment(data,36,3,530,middleHz,middleHz,peak,0)
        segment(data,48,3,220,endHz,endHz,0,peak)
        segment(data,60,3,1580,endHz,endHz,peak,0)
        return data
    }
    // Each event brings its own length: held melody notes above light, repeating accompaniment notes.
    // A small, slow change of pitch keeps long tones alive.
    // fadeInMs makes the rise of the first note longer (the music begins after silence).
    function instrument(notes: number[], beats: number[], wave: number,
        level: number, plucked: boolean, fadeInMs: number): Buffer {
        let data=control.createBuffer((notes.length*4+1)*12)
        let elapsed=0
        for(let i=0;i<notes.length;i++) {
            // The boundaries are rounded from the running total, not note by note, so the tempo does not drift.
            let end=Math.round((elapsed+beats[i])*songTickMs)
            let hz=Math.max(1,notes[i]), durationMs=end-Math.round(elapsed*songTickMs), offset=i*48
            elapsed+=beats[i]
            let peak=notes[i]==0 ? 0 : Math.floor(level*(i%3==0 ? 1 : 0.84))
            let attackMs=plucked ? 12 : 32
            let releaseMs=plucked ? 62 : Math.min(120,Math.floor(durationMs/3))
            let restMs=plucked ? 28 : 24
            if(i==0 && fadeInMs>attackMs) attackMs=Math.min(fadeInMs,durationMs-releaseMs-restMs-1)
            let holdMs=durationMs-attackMs-releaseMs-restMs
            segment(data,offset,wave,attackMs,hz,hz,0,peak)
            segment(data,offset+12,wave,holdMs,hz,hz+1,peak,Math.floor(peak*0.72))
            segment(data,offset+24,wave,releaseMs,hz+1,hz,Math.floor(peak*0.72),0)
            segment(data,offset+36,wave,restMs,hz,hz,0,0)
        }
        return data
    }
    function percussion(section: number, steps: number): Buffer {
        let data=control.createBuffer((steps*3+1)*12)
        for(let i=0;i<steps;i++) {
            // A light bass drum, soft backbeats and quiet ticks; no drum rolls before the cuts.
            // Section 5 has only ticks.
            let ticksOnly=section==5
            // Section 0 has no bass drum in its first four eighths: the music fades in.
            let kick=!ticksOnly && !(section==0 && i<4) && (i%8==0 || i%8==3 || i%8==6)
            let snare=!ticksOnly && (i%8==2 || i%8==7)
            let level=kick ? 378 : snare ? 189 : ticksOnly ? 45 : 59
            if(section==0) level=Math.floor(level*(i%2!=0 ? 0.4 : 0.6))
            if(section==4) level=Math.floor(level*0.75)
            if(section==7 || section==8) level=Math.floor(level*0.65)
            let wave=kick ? 3 : 18, hz=kick ? 160 : snare ? 900 : 1800
            let end=kick ? 48 : 200, offset=i*36
            segment(data,offset,wave,8,hz,hz,0,level)
            let decayMs=kick ? 118 : snare ? 88 : 42
            let durationMs=Math.round((i+1)*songTickMs)-Math.round(i*songTickMs)
            segment(data,offset+12,wave,decayMs,hz,end,level,0)
            segment(data,offset+24,wave,durationMs-8-decayMs,end,end,0,0)
        }
        return data
    }
    // Builds the five voices of ONE part into song (about 5 KB). The whole music at once needed about 55 KB,
    // more than the Calliope mini 3 has free next to the screen and the mine (the screen then stayed black).
    function compose(section: number) {
        song=[]
        preparedPart=section
        // Notes from D major. The roots of the chords in each section: D D G A D B G A D A D.
        const roots=[147,147,196,220,147,247,196,220,147,220,147]
        const thirds=[185,185,247,277,185,294,247,277,185,277,185]
        const fifths=[220,220,294,330,220,370,294,330,220,330,220]
        if(section>=0 && section<songTimesMs.length) {
            let root=roots[section], third=thirds[section], fifth=fifths[section]
            let steps=Math.round(songLengthsMs[section]/songTickMs)
            let bass: number[]=[], bassRhythm: number[]=[], arp: number[]=[], ticks: number[]=[]
            for(let i=0;i<steps;i++) {
                // An arpeggio of root, third and fifth (for D this is Brummi's motif).
                arp.push(section==0 && i%2!=0 ? 0 : [root*2,third*2,fifth*2,third*2][i%4])
                ticks.push(1)
            }
            // A bouncing bass on root and fifth keeps the beat light.
            for(let i=0;i<steps/6;i++) {
                bass.push(root); bass.push(root); bass.push(fifth); bass.push(root)
                bassRhythm.push(2); bassRhythm.push(1); bassRhythm.push(1); bassRhythm.push(2)
            }
            // Small arcs up and down; section 5 is Brummi's motif D, F sharp, A, F sharp.
            let lead=[294,370,440,370,494,440,370,330]
            let rhythm=[3,1,2,3,1,2,3,3]
            if(section==0) { lead=[294,0,370,0,440,0]; rhythm=[3,3,3,3,3,3] }
            if(section==2) lead=[494,587,494,440,370,440,494,440]
            if(section==3) lead=[440,494,440,330,370,330,440,494]
            if(section==4) { lead=[370,330,294,0,330,294]; rhythm=[3,3,3,3,3,3] }
            if(section==5) { lead=[294,370,440,370,294,370,440,370]; rhythm=[2,2,2,3,2,2,2,3] }
            if(section==6) lead=[494,587,659,587,494,440,494,587]
            if(section==7) lead=[440,494,659,494,440,370,330,440]
            if(section==8) lead=[587,494,440,370,440,494,587,440]
            if(section==9) lead=[659,587,494,440,494,587,659,740]
            if(section==10) { lead=[370,440,587]; rhythm=[2,2,14] }
            if(section!=10) {
                let count=lead.length
                for(let i=0;i<count;i++) { lead.push(lead[i]); rhythm.push(rhythm[i]) }
            }
            let studio=section==7 || section==8, first=section==0,
                brummi=section==5, fadeMs=first ? 400 : 0
            song.push(instrument(bass,bassRhythm,3,
                first ? 200 : studio ? 290 : 380,true,fadeMs))
            song.push(instrument([third,fifth,third],
                [steps/3,steps/3,steps/3],1,
                brummi ? 0 : first ? 200 : studio ? 180 : 260,false,fadeMs))
            song.push(instrument(lead,rhythm,1,
                first ? 240 : studio ? 300 : section>=9 ? 400 : 360,false,fadeMs))
            song.push(instrument(arp,ticks,1,
                brummi ? 0 : first ? 110 : studio ? 140 : 210,true,fadeMs))
            song.push(percussion(section,steps))
        }
    }
    // A phrase of equal sine tones (0 = rest): Brummi's hum (his motif D, F sharp, A, F sharp) and the drops of the
    // mine air. Rests are explicit instructions with volume zero; no clocks and no waiting notes survive a skip.
    function phrase(notes: number[], durationMs: number, level: number): Buffer {
        let data = control.createBuffer((notes.length * 3 + 1) * 12)
        let beatMs = Math.floor(durationMs / notes.length)
        for (let i = 0; i < notes.length; i++) {
            let offset = i * 36, note = notes[i]
            let peak = note == 0 ? 0 : level
            segment(data, offset, 3, 110, Math.max(1,note), Math.max(1,note), 0, peak)
            segment(data, offset + 12, 3, beatMs - 210,
                Math.max(1,note), Math.max(1,note), peak, 0)
            segment(data, offset + 24, 3, 100, 1, 1, 0, 0)
        }
        return data
    }
    function atmosphere(nowMs: number) {
        // The training keeps its clear, single action sounds. Ambient sounds play only in a real shift, and in the lift
        // room it stays quiet.
        if (Night.mode != Night.Mode.Play || Night.room == 0 || Night.hidden >= 0) return
        if (nowMs < busyUntilMs && priority >= 2) return
        if (nowMs >= nextAtmosphereMs) {
            let kind = Night.rooms[Night.room].kind
            let index = (kind + atmosphereIndex++) % atmospheres.length
            music.playInstructions(0, atmospheres[index])
            nextAtmosphereMs = nowMs + 7200 + (kind % 3) * 900
        }
        // Brummi hums his motif when he is near; faster while he follows the player.
        if (Night.beepDistance <= 12 && Night.brummi.state != Night.Bot.Dock
            && nowMs >= nextHumMs) {
            let eager = Night.brummi.state == Night.Bot.Follow
            music.playInstructions(0, hum[eager ? 1 : 0])
            nextHumMs = nowMs + (eager ? 2100 : 4200)
        }
    }
    export function init() {
        sounds = []; lengthsMs = []
        add(18, 90, 60, 0, 8, 24)                  // 0: unused
        add(18, 700, 240, 260, 15, 100)            // 1: soft switch
        tune(1, [988,988,60, 1319,1319,90], 240, 8) // 2: pickup, bright ping
        add(18, 600, 160, 280, 20, 190)            // 3: latch / work at the generator
        tune(3, [1400,1900,180, 1700,1700,120], 300, 20) // 4: whistle, two tones, no noise
        // 5: Brummi spots the player and follows (three happy rising tones)
        tune(1, [587,587,80, 740,740,80, 880,880,140], 260, 10)
        tune(1, [392,392,240, 330,330,240, 262,262,420], 300, 50) // 6: end of the shift, soft and falling
        tune(1, [880,880,70, 0,0,60, 1175,1175,90], 220, 8) // 7: Brummi wakes up (beep beep)
        // 8: a whistle that reaches Brummi: the same two tones as 4, then his trill
        // (core.ts sends 8 instead of 4 in the same frame, so the whistle stays audible).
        melody(3, [1400,1900,180, 1700,1700,120, 0,0,80,
            1175,1175,50, 1319,1319,50, 1175,1175,50, 1319,1319,50, 1175,1175,50, 1480,1480,90],
            [300,300,0,200,200,200,200,200,200], 20)
        // 9: shift done, rising D major
        tune(1, [587,587,130, 740,740,130, 880,880,130, 1175,1175,700], 300, 15)
        // 10: free (never sent; the number stays so the others keep theirs)
        sounds.push(sounds[0]); lengthsMs.push(0)
        add(18, 360, 100, 150, 12, 100)            // 11: muffled footstep
        add(18, 800, 180, 340, 20, 220)            // 12: a fuse clicks into place
        add(1, 880, 1175, 170, 10, 90)             // 13: beep (Brummi is near)
        tune(3, [1320,880,70, 0,0,120, 990,660,70], 110, 6) // 14: water drops
        add(18, 320, 180, 110, 350, 1500)          // 15: wind outside
        add(18, 240, 120, 160, 250, 1400)          // 16: the cage moves
        add(18, 440, 110, 200, 20, 260)            // 17: scattered sparks
        add(1, 294, 440, 260, 500, 1600)           // 18: the title swells, then silence
        add(1, 523, 262, 200, 80, 650)             // 19: soft power-off in the intro
        add(18, 300, 120, 95, 12, 90)              // 20: walking, softer than running
        tune(1, [659,659,90, 880,880,130], 240, 10) // 21: training ready
        add(3, 523, 1047, 300, 140, 520)           // 22: the monitor switches on, softly
        add(1, 294, 587, 240, 600, 1050)           // 23: studio swell
        sounds.push(signature(294,370,440,480));lengthsMs.push(3100) // 24: signature chord
        tune(1, [880,880,80, 1175,1175,80, 880,880,160], 260, 10) // 25: Brummi takes a fuse
        tune(1, [784,659,140], 160, 10)            // 26: Brummi finds nothing
        tune(1, [784,784,90, 0,0,70, 784,784,110], 220, 10) // 27: the lamp is getting weak (double tone)
        tune(1, [1175,1175,80, 880,880,140], 200, 10) // 28: Brummi puts the fuse back
        tune(3, [1760,1760,450, 2637,2637,650], 220, 5) // 29: little bell (intro)
        tune(1, [880,880,80, 0,0,60, 1175,1175,80, 0,0,60, 1480,1480,140], 200, 8) // 30: rising beeps (intro)
        harmonyLow=signature(370,440,587,400)
        harmonyHigh=signature(440,587,740,340)
        busyUntilMs = 0; priority = 0; previousMode = -1; previousAgeMs = -1
        introCue = 0; songCue = 0; silenced = false; song=[]; preparedPart=-1
        nextAtmosphereMs=0; nextHumMs=0; atmosphereIndex=0
        // Soft hum, high drops, gentle air, a second pattern of drops; nothing below 100 hertz.
        atmospheres = [envelope(3,220,220,80,900,2600),
            phrase([1175,0,880,0],2400,100),
            envelope(18,420,260,90,1000,3000),
            phrase([988,0,0,740],2800,90)]
        hum = [phrase([587,740,880,740],1600,120),
            phrase([587,740,880,740],1200,150)]
        stepWater=envelope(18,820,170,130,18,160)
        stepMetal=envelope(18,1200,220,155,12,130)
        stepWaterRun=envelope(18,980,140,190,18,190)
        stepMetalRun=envelope(18,1400,180,220,12,160)
        // The music is built part by part while the intro runs.
    }

    function stop() {
        music.stopAllSounds()
        busyUntilMs = 0; priority = 0
    }
    function play(id: number, newPriority: number, nowMs: number) {
        if (id <= 0 || id >= sounds.length) return
        // Cues in the foreground interrupt weaker ones at once; they are never put in a queue.
        if (nowMs < busyUntilMs && newPriority <= priority) return
        if (nowMs < busyUntilMs) stop()
        let buffer=sounds[id]
        if ((id==11 || id==20) && Night.rooms.length>0) {
            let surface=Night.tile(Night.room,Math.floor(Night.playerX/8),Math.floor(Night.playerY/8))
            if(surface==3) buffer=id==11 ? stepWaterRun : stepWater
            if(surface==2) buffer=id==11 ? stepMetalRun : stepMetal
        }
        music.playInstructions(0, buffer)
        if(id==24) {
            music.playInstructions(0,harmonyLow)
            music.playInstructions(0,harmonyHigh)
        }
        busyUntilMs = nowMs + ((id==11 || id==20) ? 190 : lengthsMs[id]); priority = newPriority
    }
    export function update(nowMs: number) {
        let lastAgeMs = previousAgeMs
        let modeChanged = previousMode != Night.mode || Night.ageMs < lastAgeMs
        previousMode = Night.mode; previousAgeMs = Night.ageMs
        if (modeChanged) {
            stop()
            introCue = 0
            songCue = 0
            song = []; preparedPart = -1
            nextAtmosphereMs=nowMs+1200
            nextHumMs=nowMs+600
        }
        // Skipping inside the intro (to the card) cuts off the running music once; the card then plays its own cues.
        else if (Night.mode == Night.Mode.Intro && Night.ageMs - lastAgeMs > 1000) stop()
        if (Night.muted || Night.mode == Night.Mode.Pause) {
            if (!silenced) stop()
            silenced = true; Night.effect = 0
            return
        }
        if (silenced) { silenced = false; Night.effect = 0 }
        if (Night.mode == Night.Mode.Intro) {
            Night.effect = 0
            while(songCue<songTimesMs.length && Night.ageMs>=songTimesMs[songCue]) {
                let cue=songCue++
                if(Night.ageMs-songTimesMs[cue]<150) {
                    if(preparedPart!=cue) compose(cue)
                    // The mixer keeps each buffer while it plays; song may already move on to the next part.
                    for(let voice=0;voice<5;voice++) music.playInstructions(0,song[voice])
                    song=[]; preparedPart=-1
                }
            }
            // Build the next part right after the previous one starts, seconds before it is due, so its start only
            // plays the sound.
            if(songCue<songTimesMs.length && preparedPart!=songCue) compose(songCue)
            // If time jumps, old cues are thrown away instead of being played all at once.
            while (introCue < cueTimesMs.length
                && Night.ageMs >= Night.introRealTimeMs(cueTimesMs[introCue])) {
                let cue = introCue++
                if (Night.ageMs - Night.introRealTimeMs(cueTimesMs[cue]) < 150)
                    play(cueSounds[cue], 1, nowMs)
            }
            return
        }
        if (Night.effect > 0) {
            let id = Night.effect, newPriority = Night.effectPriority
            Night.effect = 0
            play(id, newPriority, nowMs)
        }
        atmosphere(nowMs)
    }
}
