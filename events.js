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
      case 80:
        onClickRecPlay()
        break;
      case 67:
        onClickClear()
        break;
      case 85:
        onClickUndo()
        break;
      default:
        break;
    }
  })
})
