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
