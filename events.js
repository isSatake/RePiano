const onClickRecPlay = function() {
  recAndPlay()
}

const onClickDM = function() {
  dynamicmacro()
}

const onClickClear = function(){
  clear()
}

const onClickUndo = function(){
  undo()
}

$(function(){
  navigator.requestMIDIAccess().then(successCallback, errorCallback)

  $(window).keydown(function(e){
    switch(e.keyCode){
      case 49: //1
        onClickRecPlay()
        break;
      case 50: //2
        onClickDM()
        break;
      case 51: //3
        onClickClear()
        break;
      case 52: //4
        onClickUndo()
        break;
      default:
        break;
    }
  })
})
