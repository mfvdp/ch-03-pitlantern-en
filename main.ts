// Connects the keys and the screen of the device to the game and gives the sounds their time.
let lastFrameMs = control.millis()
NightAudio.init()
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () { Night.pause() })
game.onUpdate(function () {
    let nowMs = control.millis()
    let dt = Math.min(50,nowMs-lastFrameMs)
    lastFrameMs = nowMs
    let keys = 0
    if (controller.left.isPressed()) keys |= 1
    if (controller.right.isPressed()) keys |= 2
    if (controller.up.isPressed()) keys |= 4
    if (controller.down.isPressed()) keys |= 8
    if (controller.A.isPressed()) keys |= 16
    if (controller.B.isPressed()) keys |= 32
    Night.update(dt,keys)
    NightAudio.update(nowMs)
})
game.onPaint(function () { Night.render() })
