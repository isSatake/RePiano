// MIDIについて
// 基本的にイベントとデルタタイム(直前のイベントからの経過時間)の2種類で構成されている
// トラックごとに管理する場合と、すべてシーケンシャルに保存するパターンがある
// 普通は前者らしい
//http://qiita.com/PianoScoreJP/items/71db2907b302793544e9

// ひとまずイベント,デルタタイムをHTMLにappendしていくプログラムを書く
// デルタタイムをどう扱うか
// 経過時間はイベントに含まれている
// イベントが発生したとき、(直前のイベント.timeStamp - イベント.timeStamp)をappendする

const inputSelector = document.getElementById('input_selector')
const outputSelector = document.getElementById('output_selector')
const events = document.getElementById('events');
let inputs, outputs, inputId, outputDevice
let eventsArray = []
let isStop = false

const successCallback = function(access) {
  inputs = access.inputs
  for(let input of inputs.values()) {
    const optionEl = document.createElement('option')
    optionEl.text = input.name
    optionEl.value = input.id
    inputSelector.add(optionEl)
    input.onmidimessage = handleMIDIMessage
  }

  outputs = access.outputs
  for(let output of outputs.values()) {
    const optionEl = document.createElement('option')
    optionEl.text = output.name
    optionEl.value = output.id
    outputSelector.add(optionEl)
    outputDevice = output
  }
}
const errorCallback = function(msg) {
  console.log("[ERROR] ", msg);
}

const handleMIDIMessage = function(e){
  if(e.target.id != inputId){
    return
  }

  try {
    const deltaTime = e.timeStamp - eventsArray[eventsArray.length - 1].timeStamp
    const time = document.createElement('div')
    time.innerHTML = deltaTime
    events.prepend(time)
    eventsArray.push({time: deltaTime})
  }catch(err){}

  const isNoteOn = e.data[0].toString(16) == 90 ? true : false
  const note = e.data[1]
  const velocity = e.data[2]
  const event = document.createElement('div')
  let text = isNoteOn ? "note on, " : "note off, "
  text += `note: ${note}, vel: ${velocity}`
  event.innerHTML = text
  events.prepend(event)
  eventsArray.push(e)
}

const onChangeInputDevice = function(obj) {
  inputId = obj.options[obj.selectedIndex].value
  for(let input of inputs.values()) {
    if(input.id == inputId){
      input.onmidimessage = handleMIDIMessage
    }
  }
}

const onChangeOutputDevice = function(obj) {
  const id = obj.options[obj.selectedIndex].value
  for(let output of outputs.values()) {
    if(output.id == id){
      outputDevice = output
    }
  }
}

const send = function(array){
  outputDevice.send(array)
}

const timeoutSend = function(array, isInfinity = true){
  let index = 0
  co()
  function co(){
    if(isStop == true){
      isStop = false
      return
    }
    console.log(index)
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

const repeat = function(){
  let _eventsArray = eventsArray.slice() //オリジナル
  const boundary = _eventsArray.slice(_eventsArray.length - 4)
  eventsArray = [] //初期化

  _eventsArray = _eventsArray.reverse().slice(4) //後ろから走査する boundaryは除く
  boundary.reverse() //boundaryも合わせる

  //Rule1
  //(loop >= 2)
  _eventsArray.forEach((e, index) => { //TODO どこまで走査するか？
    //boundaryを見つける(loop >= 2)
    if(_eventsArray[index+3] === undefined){
      return
    }
    if(compareEvent(_eventsArray[index], boundary[0]) &&
       compareEvent(_eventsArray[index+1], boundary[1]) &&
       compareEvent(_eventsArray[index+2], boundary[2]) &&
       compareEvent(_eventsArray[index+3], boundary[3])) {
      let loop = boundary.concat(_eventsArray.slice(0, index)) //boundaryのみの場合もある
      console.log(loop)
      loop = loop.reverse()
      loop.push(loop.shift()) //先頭のTimeを末尾に
      timeoutSend(loop, true)
      return
    }
  })
  //(loop = 1)
  // timeoutSend(boundary)
  return
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

navigator.requestMIDIAccess().then(successCallback, errorCallback)
