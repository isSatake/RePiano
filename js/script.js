const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const inputEl = document.getElementById('inputdevice')
const eventsHtml = document.getElementById('events')
const loopsHtml = document.getElementById('loops')
const piano = Synth.createInstrument('piano')
const audioContext = new AudioContext()
let isSoundOn = true
let inputs, outputs, inputId, outputDevice

/* Looper Class */

function Looper(id, events, isBaseLoop, startIndex = 0) {
  this.id = id
  this.array = events
  this.isStop = false
  this.isBaseLoop = isBaseLoop

  if(startIndex < 0){
    return
  }
  this.start(startIndex)
}

Looper.prototype.start = function(startIndex = 0){
  const obj = this
  let index = startIndex
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

const debugEvents = (array) => {
  if(array === undefined){
    return
  }

  let str = "["
  for(let event of array){
    if(event.time > 0){
      str += Math.floor(event.time)
    }else{
      str += getNoteName(event.data[1])
      str += isNoteOn(event.data[0]) ? "on" : "of"
    }
    str += ", "
  }
  str += "]"
  console.log(str)
}

const player = {
  loopId: -1,
  loops: [],
  loopTimer: null,
  maxDuration: 0,
  registLoop: function(events, isBaseLoop){
    const dynamicmacro = findRep(events)
    const isDynamicMacro = dynamicmacro != null
    let loop = []

    this.loopId++

    if(isBaseLoop){
      if(isDynamicMacro){
        events = dynamicmacro
        console.log(`maxduration: ${this.maxDuration}`)
      } else {
        const currentTime = audioContext.currentTime * 1000
        const deltaTime = currentTime - events[events.length - 1].rTimeStamp
        events.push({time: deltaTime, timeStamp: currentTime / 1000})
      }

      loopTimer.init()
      this.maxDuration = getDuration(events)
      this.loops.push(new Looper(this.loopId, events, isBaseLoop))

    }else{
      //eventsの長さをbaseLoop*2の時間内に収める
      const fromLoop = events[0].fromLoop
      const fromStart = loopTimer.getTimeFromStartLoop()
      const sleep = fromStart > fromLoop ? 0 : fromLoop - fromStart
      const startIndex = fromStart > fromLoop ? -1 : 1
      events = isDynamicMacro == true ? dynamicmacro : events
      events = clampDuration(events, this.maxDuration)
      events.unshift({time: fromLoop})
      //待つ
      setTimeout(() => {
        this.loops.push(new Looper(this.loopId, events, isBaseLoop, startIndex))
      }, sleep) //登録だけして，再生しない状態を作りたい

      console.log(`TL = ${fromLoop}`)
      console.log(`Tl = ${fromStart}`)
      console.log(`Tl' = ${sleep}`)
      // setTimeout(() => {
      //   this.loops.push(new Looper(this.loopId, events, isBaseLoop, 1))
      // }, sleep > 0 ? sleep : this.maxDuration - loopTimer.getTimeFromStartLoop())
      // this.loops.push(new Looper(this.loopId, events, isBaseLoop))
    }

    console.log("registered")
    debugEvents(events)
    // this.loops.push(new Looper(this.loopId, events, isBaseLoop))

    return {id: this.loopId, duration: getDuration(events), length: events.length, dynamicmacro: isDynamicMacro}
  },
  onStartBaseLoop: function(){
    //ベースループ以外を頭出し
    loopTimer.reset()
    for(let i = 1; i < loopStack.stack.length; i++){
      const id = loopStack.stack[i].id
      this.loops[id].start() //ここが二重再生の原因
    }
  },
  unregistLoop: function(id){
    //idを持つルーパークラスを削除
    this.loops[id].stop()
    this.loops[id] = undefined
  }
}

const getDuration = function(events){
  let duration = 0

  events.forEach((event) => {
    duration += event.time > 0 ? event.time : 0
  })

  return duration
}

const clampDuration = function(events, maxDuration){
  let duration = 0
  let clamped = []

  for(let i = events.length - 1; i >= 0; i--){
    if(duration > maxDuration){
      return clamped
    }

    clamped.unshift(events[i])
    duration += events[i].time > 0 ? events[i].time : 0
  }

  return events
}

/* 再生中のループとView管理 */

const loopStack = {
  stack: [],
  maxDuration: 0,
  isRunning: function(){
    return this.stack.length > 0
  },
  push: function(events, isDynamicMacro){
    if(events.length < 1){
      return
    }

    this.stack.push(player.registLoop(events, !this.isRunning()))
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
      div.innerHTML = `loop: ${loop.id} duration: ${Math.round(loop.duration) / 1000}s ${loop.dynamicmacro ? 'dm' : ''}`
      loopsHtml.prepend(div)
    })
  }
}


/* MIDIイベントの処理　*/

const events = {
  array: [],
  //全イベントが格納される
  push: function(e){
    const fromLoop = loopStack.isRunning() ? loopTimer.getTimeFromStartLoop() : 0
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
        this.array.push({fromLoop: fromLoop, time: deltaTime, timeStamp: currentTime})
      }
    }

    const note = getNoteName(e.data[1])
    const octave = Math.floor((e.data[1] / 12) - 1)
    const velocity = e.data[2]
    const event = document.createElement('div')
    let text = isNoteOn(e.data[0]) ? "note on, " : "note off, "
    text += `note: ${note}${octave}, vel: ${velocity}`
    event.innerHTML = this.getLength() + ': ' + text
    eventsHtml.prepend(event)
    e.fromLoop = fromLoop
    this.array.push(e)
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

const getNoteName = (n) => {
  return NOTES[n % 12]
}

const isNoteOn = (n) => {
  return n.toString(16) == 90 ? true : false
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

const switchSound = function(){
  isSoundOn = document.getElementById('soundswitch').checked
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
  for(let output of outputs.values()) {
    if(output.name.indexOf("KEY") < 0){
      outputDevice = output
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
  events.push(e, false)
  send(e)
}


/* Playing */

const playInternal = function(array){
  const data = array.data
  const note = data[1]
  const velocity = data[2]
  const noteName = NOTES[note % 12]
  const octave = (note / 12) - 1
  if(isNoteOn(data[0])){
    piano.play(noteName, octave, 2)
  }
}

const send = function(array){
  if(isSoundOn == true){
    playInternal(array)
  }

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

const compare = function(origin, compare){
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

const findRep = (array) => {
  let arr = array.concat()
  arr = eventReverse(arr)
  console.log("origin")
  debugEvents(arr)

  let searchIndex = 3
  let dptr0 = eventIndexOf(arr, arr.slice(0, searchIndex), searchIndex)
  let dptr = dptr0
  let maxptr

  if(dptr0 < 0){
    return null
  }

  const len = arr.length
  let predictstr

  while(searchIndex * 2 < len){
    if(dptr0 == searchIndex){
      maxptr = searchIndex
    }
    searchIndex++
    dptr = dptr0
    dptr0 = eventIndexOf(arr, arr.slice(0, searchIndex), searchIndex)

    if(dptr0 > 0){
      predictstr = eventReverse(arr.slice(0, dptr))
      console.log("candidate")
      debugEvents(predictstr)
    }
  }

  //[note, deltatime, note]を最小単位とする
  if(searchIndex == 4){
    return null
  }

  console.log("predict")
  debugEvents(predictstr)
  return predictstr
}

const eventIndexOf = (arr, arg, start = 0) => {
  const arrlen = arr.length
  const arglen = arg.length
  let argIndex = 0

  for(let i = start; i < arrlen; i++){
    if(compare(arg[argIndex], arr[i]))  {
      argIndex++
      if(argIndex == arglen){
        return i + 1 - argIndex
      }
    }
  }

  return -1
}

const eventReverse = (arr) => {
  return arr.concat().reverse()
}
