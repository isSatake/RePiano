// MIDIについて
// 基本的にイベントとデルタタイム(直前のイベントからの経過時間)の2種類で構成されている
// トラックごとに管理する場合と、すべてシーケンシャルに保存するパターンがある
// 普通は前者らしい
//http://qiita.com/PianoScoreJP/items/71db2907b302793544e9

// ひとまずイベント,デルタタイムをHTMLにappendしていくプログラムを書く
// デルタタイムをどう扱うか
// 経過時間はイベントに含まれている
// イベントが発生したとき、(直前のイベント.timeStamp - イベント.timeStamp)をappendする

// 記録する✅
// MIDI出力する✅
// DynamicMacroする

const inputSelector = document.getElementById('input_selector')
const outputSelector = document.getElementById('output_selector')
const events = document.getElementById('events');
let inputs, outputs, inputId, outputDevice
let eventsArray = []

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

const onClickPlay = function() {
  timeoutSend()
}

const onClickClear = function(){
  clearEvents()
}

const timeoutSend = function(){
  let index = 0
  co()
  function co(){
    const e = eventsArray[index]
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

navigator.requestMIDIAccess().then(successCallback, errorCallback)
