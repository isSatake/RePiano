const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const inputEl = document.getElementById('inputdevice')
const outputEl = document.getElementById('outputdevice')
const eventsHtml = document.getElementById('events');
const piano = Synth.createInstrument('piano')
const audioContext = new AudioContext()
let inputs, outputs, inputId, outputDevice
let eventsArray = []
let rewindMarkersArray = [0] //最初はeventsArrayの先頭に設定
let isStop = false

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
  const currentTime = audioContext.currentTime
  if(e.target.id != inputId){
    return
  }

  try {
    const deltaTime = e.timeStamp - eventsArray[eventsArray.length - 1].timeStamp
    const time = document.createElement('div')
    time.innerHTML = deltaTime
    eventsHtml.prepend(time)
    eventsArray.push({time: deltaTime, timeStamp: currentTime})

    if(deltaTime >= 3000){
      markRewind(eventsArray.length)
    }
  }catch(err){}

  playInternal(e.data)

  const isNoteOn = e.data[0].toString(16) == 90 ? true : false
  const note = e.data[1]
  const velocity = e.data[2]
  const event = document.createElement('div')
  let text = isNoteOn ? "note on, " : "note off, "
  text += `note: ${note}, vel: ${velocity}`
  event.innerHTML = text
  eventsHtml.prepend(event)
  eventsArray.push(e)
  //MIDIMessage.timeStampとAudioContext.currentTimeは時間単位以外同じ
}

const playInternal = function(array){
  const isNoteOn = array[0].toString(16) == 90 ? true : false
  const note = array[1]
  const velocity = array[2]
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

const timeoutSend = function(array, isInfinity = true){
  let index = 0
  co()
  function co(){
    if(isStop == true){
      isStop = false
      return
    }
    if(array.length == index && isInfinity == true){
      index = 0
    }
    const e = array[index]
    if(e.data){
      send(e.data)
      index++
      co()
    }
    if(e.time){
      console.log(e.time)
      setTimeout(function(){
        index++
        co()
      }, e.time)
    }
  }
}

const clearEvents = function(){
  eventsArray = []
  document.getElementById('events').innerHTML = ''
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
    console.log(k)
    res = a.slice(len - 3 - k, len - 1)
  }
  return res
}

const repeat = function(){
  let _eventsArray = eventsArray.slice() //オリジナル
  const rep = findRep(_eventsArray, compareEvent)
  timeoutSend(rep, true)
}

const markRewind = function(position){
  rewindMarkersArray[0] = position
  const rew = document.createElement('div')
  rew.innerHTML = `====== REWIND MARKER ${position} ======`
  eventsHtml.prepend(rew)
}

const rewind = function(times){
  let _eventsArray = eventsArray.slice()
  const arr = _eventsArray.slice(rewindMarkersArray[0])
  timeoutSend(arr, false)
  markRewind(_eventsArray.length)
  //TODO 再帰的に履歴を記録する
  //TODO rewindMarkersArray.length > 3 にならないようにしたい
}

const compareEvent = function(origin, compare){
  // timeか、dataか
  const isTimeOrigin = origin.hasOwnProperty('time')
  const isTimeCompare = compare.hasOwnProperty('time')
  if(isTimeOrigin && isTimeCompare){
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

const stopRepeat = function() {
  isStop = true
}

const onClickPlay = function() {
  timeoutSend(eventsArray, false)
}

const onClickClear = function(){
  clearEvents()
}

const onClickRepeat = function(){
  repeat()
}

const onClickStop = function(){
  stopRepeat()
}

const onClickRewind1 = function(){
  rewind(1)
}

const onClickRewind2 = function(){
  rewind(2)
}

const onClickRewind3 = function(){
  rewind(3)
}

$(function(){
  navigator.requestMIDIAccess().then(successCallback, errorCallback)

  $(window).keydown(function(e){
    switch(e.keyCode){
      case 37:
        onClickPrev()
        break;
      case 80:
        onClickPlay()
        break;
      case 67:
        onClickClear()
        break;
      case 82:
        onClickRepeat()
        break;
      case 83:
        onClickStop()
        break;
      case 49:
        onClickRewind1()
        break;
      case 50:
        onClickRewind2()
        break;
      case 51:
        onClickRewind3()
        break;
      default:
        break;
    }
  })
})
