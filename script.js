const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const inputEl = document.getElementById('inputdevice')
const outputEl = document.getElementById('outputdevice')
const eventsHtml = document.getElementById('events')
const loopsHtml = document.getElementById('loops')
const piano = Synth.createInstrument('piano')
const audioContext = new AudioContext()
let inputs, outputs, inputId, outputDevice
let isStop = false

function Looper(id, events) {
  this.id = id
  this.array = events
  this.isStop = false
  this.start()
}

Looper.prototype.start = function(){
  const obj = this
  let index = 0
  co()
  function co(){
    if(obj.isStop == true){
      return
    }
    if(obj.array.length == index){
      index = 0
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

const player = {
  loopId: -1,
  loops: [],
  startLoop: function(events){
    //ループ再生クラスを初期化してloopIdを振っていく
    this.loopId += 1
    this.loops.push(new Looper(this.loopId, events))
    return this.loopId
  },
  stopLoop: function(id){
    //idを持つループ再生クラスを削除
    this.loops[id].stop()
    this.loops[id] = undefined
  }
}

const loopStack = {
  stack: [],
  push: function(events){
    const length = events.length
    if(length < 1){
      return
    }
    const dynamicmacro = findRep(events, compareEvent)
    const loopId = player.startLoop(dynamicmacro.length > 0 ? dynamicmacro : events)
    this.stack.push({id: loopId, length: length, dynamicmacro: dynamicmacro.length > 0})
    this.draw()
  },
  pop: function(){
    player.stopLoop(this.stack.pop().id)
    this.draw()
  },
  clear: function(){
    this.stack.forEach(function(loop, index, array){
      player.stopLoop(loop.id)
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

const events = {
  array: [],
  push: function(events){
    this.array.push(events)
  },
  record: function(e){
    e.rTimeStamp = audioContext.currentTime * 1000

    if(this.getLength() > 0){
      const currentTime = audioContext.currentTime
      const deltaTime = e.rTimeStamp - this.array[this.getLength() - 1].rTimeStamp
      if(deltaTime >= 2000){
        this.clear()
      }else{
        const time = document.createElement('div')
        time.innerHTML = this.getLength() + ': ' + Math.floor(deltaTime) + 'msec'
        eventsHtml.prepend(time)
        this.push({time: deltaTime, timeStamp: currentTime})
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
    this.push(e)
    //MIDIMessage.timeStampとAudioContext.currentTimeは時間単位以外同じ
  },
  copy: function(){
    return this.array.slice()
  },
  getLength: function(){
    return this.array.length
  },
  recAndPlay: function(){
    //loopStack操作
    const currentTime = audioContext.currentTime * 1000
    const deltaTime = currentTime - this.array[this.getLength() - 1].rTimeStamp
    // this.push({time: deltaTime, timeStamp: currentTime / 1000})
    loopStack.push(this.array)
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
  // timeか、dataか
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

const stopRepeat = function() {
  isStop = true
}

const findRep = function(a, compare) {
  if(compare === undefined){
    compare = (x, y) => { return x === y }
  }
  const len = a.length;
  let res = [];
  let i, j, k
  //1回半くらい弾いて予測する
  for(k = 0; k < len - 3; k++){
    if (len - 4 - k < 0) {
      continue
    }
    if (!compare(a[len - 1], a[len - 3 - k]) ||
        !compare(a[len - 2], a[len - 4 - k])
      ) {
      continue
    }
    res = a.slice(len - 3 - k, len - 1)
  }
  return res
}

const repeat = function(){
  let _eventsArray = events.copy()
  const rep = findRep(_eventsArray, compareEvent)
  timeoutSend(rep, true)
}
