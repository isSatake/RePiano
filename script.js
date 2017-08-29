const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const inputEl = document.getElementById('inputdevice')
const outputEl = document.getElementById('outputdevice')
const eventsHtml = document.getElementById('events')
const loopsHtml = document.getElementById('loops')
const piano = Synth.createInstrument('piano')
const audioContext = new AudioContext()
let inputs, outputs, inputId, outputDevice

/* Looper Class */

function Looper(id, events, isBaseLoop) {
  this.id = id
  this.array = events
  this.isStop = false
  this.isBaseLoop = isBaseLoop
  this.start()
}

Looper.prototype.start = function(){
  const obj = this
  let index = 0
  obj.isStop = false
  co()
  function co(){
    if(obj.isStop == true){
      return
    }
    if(obj.array.length == index){
      if(obj.isBaseLoop == true){
        index = 0
        //ベースループの開始を通知
        player.onStartBaseLoop()
      }else{
        return
      }
    }
    if(obj.array[index] == undefined){
      return
    }
    const e = obj.array[index]
    if(e.data){
      send(e)
      index++
      co()
    }
    if(e.time != undefined){
      setTimeout(function(){
        index++
        co()
      }, e.time)
    }
  }
}

Looper.prototype.stop = function(){
  this.isStop = true
}

/* ベースループ開始時にリセットされるタイマ */

const loopTimer = {
  startTime: 0,
  init: function(){
    this.reset()
  },
  reset: function(){
    this.startTime = audioContext.currentTime * 1000
  },
  getTimeFromStartLoop: function(){
    return audioContext.currentTime * 1000 - this.startTime
  }
}

/* Loopの管理 */

const player = {
  loopId: -1,
  loops: [],
  loopTimer: null,
  isRunning: function(){
    console.log(this.loops.length)
    return this.loops.length > 0
  },
  registLoop: function(events){
    console.log(events)
    const isBaseLoop = loopStack.stack.length == 0 ? true : false
    this.loopId += 1
    this.loops.push(new Looper(this.loopId, events, isBaseLoop))

    return this.loopId
  },
  onStartBaseLoop: function(){
    //ベースループ以外を頭出し
    loopTimer.reset()
    for(let i = 1; i < loopStack.stack.length; i++){
      const id = loopStack.stack[i].id
      this.loops[id].start()
    }
  },
  unregistLoop: function(id){
    //idを持つルーパークラスを削除
    this.loops[id].stop()
    this.loops[id] = undefined
  }
}

const loopStack = {
  stack: [],
  push: function(events, isDynamicMacro){
    const length = events.length
    const isRunning = player.isRunning()
    let dynamicmacro = []

    if(length < 1){
      return
    }
    // if(isDynamicMacro == true){
      dynamicmacro = findRep(events, compareEvent)
    // }
    if(isRunning){
      events.unshift({time: events[0].fromLoop})
    }
    if(dynamicmacro.length < 1){
      const currentTime = audioContext.currentTime * 1000
      const deltaTime = currentTime - events[length - 1].rTimeStamp
      events.push({time: deltaTime, timeStamp: currentTime / 1000})
    }
    const loopId = player.registLoop(dynamicmacro.length > 0 ? dynamicmacro : events)
    this.stack.push({id: loopId, length: length, dynamicmacro: dynamicmacro.length > 0})

    if(!isRunning){
      loopTimer.init()
    }

    this.draw()
  },
  pop: function(){
    if(this.stack.length < 1){
      return
    }
    player.unregistLoop(this.stack.pop().id)
    this.draw()
  },
  clear: function(){
    this.stack.forEach(function(loop, index, array){
      player.unregistLoop(loop.id)
    })
    this.stack = []
    this.draw()
  },
  draw: function(){
    loopsHtml.innerHTML = ''
    this.stack.forEach(function(loop, index, array){
      const div = document.createElement('div')
      div.innerHTML = `loop: ${loop.id} length: ${loop.length} ${loop.dynamicmacro ? 'dynamicmacro' : ''}`
      loopsHtml.prepend(div)
    })
  }
}


/* MIDIイベントの処理　*/

const events = {
  array: [],
  //全イベントが格納される
  push: function(events){
    this.array.push(events)
  },
  record: function(e){
    const fromLoop = player.isRunning() ? loopTimer.getTimeFromStartLoop() : 0
    e.rTimeStamp = audioContext.currentTime * 1000

    if(this.getLength() > 0){
      const currentTime = audioContext.currentTime
      let deltaTime = e.rTimeStamp - this.array[this.getLength() - 1].rTimeStamp
      if(deltaTime >= 2000){
        this.clear()
      }else if(deltaTime <= 15){
        deltaTime = 0
      }else{
        const time = document.createElement('div')
        time.innerHTML = this.getLength() + ': ' + Math.floor(deltaTime) + 'msec'
        eventsHtml.prepend(time)
        this.push({fromLoop: fromLoop, time: deltaTime, timeStamp: currentTime})
      }
    }

    const isNoteOn = e.data[0].toString(16) == 90 ? true : false
    const note = NOTES[e.data[1] % 12]
    const octave = Math.floor((e.data[1] / 12) - 1)
    const velocity = e.data[2]
    const event = document.createElement('div')
    let text = isNoteOn ? "note on, " : "note off, "
    text += `note: ${note}${octave}, vel: ${velocity}`
    event.innerHTML = this.getLength() + ': ' + text
    eventsHtml.prepend(event)
    e.fromLoop = fromLoop
    this.push(e)
    //MIDIMessage.timeStamp == AudioContext.currentTime * 1000
  },
  copy: function(){
    return this.array.slice()
  },
  getLength: function(){
    return this.array.length
  },
  recAndPlay: function(){
    //loopStack操作
    loopStack.push(this.array, false)
    this.clear()
  },
  dynamicmacro: function(){
    loopStack.push(this.array, true)
    this.clear()
  },
  clear: function(){
    this.array = []
    eventsHtml.innerHTML = ' '
  }
}

const recAndPlay = function(){
  events.recAndPlay()
}

const dynamicmacro = function(){
  events.dynamicmacro()
}

const clear = function(){
  events.clear()
  loopStack.clear()
}

const undo = function(){
  loopStack.pop()
}


/* MIDI */

const successCallback = function(access) {
  inputs = access.inputs
  inputEl.innerHTML = "no supported devices"
  for(let input of inputs.values()) {
    if(input.name.indexOf("KEYBOARD") > 0){
      inputId = input.id
      input.onmidimessage = handleMIDIMessage
      inputEl.innerHTML = input.name
    }
  }

  outputs = access.outputs
  outputEl.innerHTML = "no supported devices"
  for(let output of outputs.values()) {
    if(output.name.indexOf("KEY") < 0){
      outputDevice = output
      outputEl.innerHTML = output.name
      return
    }
  }
}

const errorCallback = function(msg) {
  console.log("[ERROR] ", msg);
}

const handleMIDIMessage = function(e){
  if(e.target.id != inputId){
    return
  }
  events.record(e, false)
  send(e)
}


/* Playing */

const playInternal = function(array){
  const data = array.data
  const isNoteOn = data[0].toString(16) == 90 ? true : false
  const note = data[1]
  const velocity = data[2]
  const noteName = NOTES[note % 12]
  const octave = (note / 12) - 1
  if(isNoteOn){
    piano.play(noteName, octave, 2)
  }
}

const send = function(array){
  playInternal(array)
  if(outputDevice != undefined){
    outputDevice.send(array)
  }
}


/*  Dynamic Macro */

const isSameTime = function(originTime, compareTime){
  return Math.abs(originTime - compareTime) < 50
}

const isSameData = function(originData, compareData){
  //TODO TimeClass, DataClassを作りたい
  return (originData[0] == compareData[0] &&
          originData[1] == compareData[1]
          //Math.abs(originData[2] - compareData[2]) < 40
        )
}

const compareEvent = function(origin, compare){
  // timeか，dataか
  const isTimeOrigin = origin.hasOwnProperty('time')
  const isTimeCompare = compare.hasOwnProperty('time')
   if(isTimeOrigin != undefined && isTimeCompare != undefined){
    // timeは近いか
    if(isSameTime(origin.time, compare.time)){
      return true
    }
  }
  if(!isTimeOrigin && !isTimeCompare){
    // on/off, noteは同じか
    if(isSameData(origin.data, compare.data)){
      return true
    }
  }
  return false
}

const findRep = function(array, compare) {
  if(compare === undefined){
    compare = (x, y) => { return x === y }
  }
  const len = array.length;
  let res = [];
  let i, j, k
  //1回半くらい弾いて予測する
  for(k = 0; k < len - 3; k++){
    if (len - 4 - k < 0) {
      continue
    }
    if (!compare(array[len - 1], array[len - 3 - k]) ||
        !compare(array[len - 2], array[len - 4 - k])
      ) {
      continue
    }
    res = array.slice(len - 3 - k, len - 1)
  }
  return res
}
