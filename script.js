// MIDIについて
// 基本的にイベントとデルタタイム(直前のイベントからの経過時間)の2種類で構成されている
// トラックごとに管理する場合と、すべてシーケンシャルに保存するパターンがある
// 普通は前者らしい
//http://qiita.com/PianoScoreJP/items/71db2907b302793544e9

// ひとまずイベント,デルタタイムをHTMLにappendしていくプログラムを書く
// デルタタイムをどう扱うか
// 経過時間はイベントに含まれている
// イベントが発生したとき、(直前のイベント.timeStamp - イベント.timeStamp)をappendする

const inputSelector = document.getElementById('input_selector');
const events = document.getElementById('events');
let inputs
let eventsArray = []

const successCallback = function(access) {
  inputs = access.inputs
  for(let input of inputs.values()) {
    const optionEl = document.createElement('option')
    optionEl.text = input.name
    optionEl.value = input.id
    console.log(inputSelector)
    inputSelector.add(optionEl)
  }
}
const errorCallback = function(msg) {
  console.log("[ERROR] ", msg);
}

const handleMIDIMessage = function(e){
  try {
    const deltaTime = e.timeStamp - eventsArray[eventsArray.length - 1].timeStamp
    eventsArray.push(deltaTime)
    const time = document.createElement('div')
    time.innerHTML = deltaTime
    events.prepend(time)
  }catch(err){
  }
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
  const id = obj.options[obj.selectedIndex].value
  for(let input of inputs.values()) {
    if(input.id == id){
      input.onmidimessage = handleMIDIMessage
    }
  }
}

//イベントを受け取る

navigator.requestMIDIAccess().then(successCallback, errorCallback)
