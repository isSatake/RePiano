const onClickRecPlay = function() {
  recAndPlay()
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
      case 80: //P
        onClickRecPlay()
        break;
      case 67: //C
        onClickClear()
        break;
      case 85: //U
        onClickUndo()
        break;
      default:
        break;
    }
  })
})
