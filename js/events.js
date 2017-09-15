const onClickRecPlay = function() {
  recAndPlay()
}

const onClickDM = function() {
  dynamicmacro()
}

const onClickUndo = function(){
  undo()
}

const onClickClear = function(){
  clear()
}

const onChangeSwitch = function(){
  switchSound()
}

$(function(){
  navigator.requestMIDIAccess().then(successCallback, errorCallback)

  $(window).keydown(function(e){
    switch(e.keyCode){
      case 49: //1
        onClickRecPlay()
        break;
      // case 50: //2
      //   onClickDM()
      //   break;
      case 50: //2
        onClickUndo()
        break;
      // case 52: //4
      //   onClickClear()
      //   break;
      default:
        break;
    }
    if(keymap[e.keyCode] == undefined){
      return
    }

    handleMIDIMessage({data: [144, keymap[e.keyCode], 100]})
    console.log(e.keyCode)
  })

  $(window).keyup(function(e){
    if(keymap[e.keyCode] == undefined){
      return
    }
    handleMIDIMessage({data: [128, keymap[e.keyCode], 100]})
  })
})
