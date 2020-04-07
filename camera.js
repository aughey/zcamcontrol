import { Machine, interpret } from 'xstate';
const util = require('util')
const { spawn } = require('child_process')
import { Observable } from 'rxjs'
import { first,filter,tap } from 'rxjs/operators'
const axios = require('axios')

var camera_url = 'http://10.0.0.36'

function invokeCommand(cmd) {
  return {
    invoke: {
      src: cmd,
      onDone: 'idle'
    }
  }
}

// Stateless machine definition
// machine.transition(...) is a pure function used by the interpreter.
const cameraStates = {
    initialize: { 
      invoke: {
        src: 'initialize',
	onDone: 'idle'
      }
    },
    idle: { 
	on: {
	zoomin: 'zoomin',
	zoomout: 'zoomout',
	widezoom: 'widezoom',
	halfzoom: 'halfzoom',
	narrowzoom: 'narrowzoom',
	format: 'format',
	focus: 'focus',
	focusin: 'focusin',
	focusout: 'focusout'
}
	},
    focus: invokeCommand('focus'),
    focusin: invokeCommand('focusin'),
    focusout: invokeCommand('focusout'),
    narrowzoom: invokeCommand('narrowzoom'),
    halfzoom: invokeCommand('halfzoom'),
    format: invokeCommand('format'),
    widezoom: {
      invoke: {
        src: 'widezoom',
	onDone: 'idle'
      }
    },
    zoomin: {
      invoke: {
        src: 'zoomin',
	onDone: 'idle'
      }
    },
    zoomout: {
      invoke: {
        src: 'zoomout',
	onDone: 'idle'
      }
    }
};

async function getParam(param) {
  var json = await sendCommand("/ctrl/get?k=" + param);
  return json
}

async function setParam(param,value) {
  var json = await sendCommand("/ctrl/set?param" + "=" + value);
  return json
}

async function storage() {
  var free = await sendCommand("/ctrl/card?action=query_free")
  var total = await sendCommand("/ctrl/card?action=query_total")
  return {
     free: free.msg,
     total: total.msg,
  }
}

async function isRecording() {
  var json = await sendCommand("/ctrl/mode?action=query")
  return json.msg === 'rec_ing'
}

async function startRecord() {
  var json = await sendCommand("/ctrl/rec?action=start")
  return json;
}

async function stopRecord() {
  var json = await sendCommand("/ctrl/rec?action=stop")
  return json;
}

async function sendCommand(command) {
  var url = camera_url + command;
  //console.log("Sending camera: " + url)
  var res = await axios.get(url)
  var data = await res.data;
  return data
}

function zoom(position) {
  console.log("Setting camera zoom " + position)
  return sendCommand("/ctrl/set?lens_zoom_pos=" + position)
}

async function asyncSleep(seconds) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}

async function setFocus(value) {
if(!value) {
  console.log("ERROR: tryied to set focus to non value")
return
}
console.log("Setting focus to: " + value)
      await sendCommand("/ctrl/set?lens_focus_pos=" + value)
}

async function getFocus() {
      return await getParam('lens_focus_pos')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



async function incrFocus(percent) {
      var focusvalue = await getParam('lens_focus_pos')
	var diff = focusvalue.max - focusvalue.min
 	var value = Math.round(focusvalue.value + diff * percent)
	value = Math.min(value,focusvalue.max)
	value = Math.max(value,focusvalue.min)

      await sendCommand("/ctrl/set?lens_focus_pos=" + value)
}

  var zoom_to_focus = {
    widezoom: 3245,
    halfzoom: 357,
    narrowzoom: 378
  }

const cameraImp = {
  services: {
    initialize: async function(context,event) {
      await sendCommand("/ctrl/stream_setting?index=stream1&width=1920&height=1080&bitwidth=8&venc=h264&bitrate=10000000")
      //await sendCommand("/ctrl/stream_setting?index=stream1&width=3840&height=2160&bitwidth=8&venc=h264&bitrate=40000000")
      await setParam('focus','AF')
      await setParam('caf','Off')
      await setParam('ain_gain_type','Manual')
      await setParam('audio_input_gain','-40')
      var zoomvalue = await getParam('lens_zoom_pos')
      context.pos = zoomvalue.value
      var focusvalue = await getParam('lens_focus_pos')
      console.log(focusvalue)
      
      return true
    },
    focus: async () => {
      await sendCommand("/ctrl/af")
    },
    focusin: () => {
      return incrFocus(0.01)
    },
    focusout: async () => {
      return incrFocus(-0.01)
    },
    format: async () => {
      await sendCommand("/ctrl/card?action=format")
    },
    halfzoom: async (context,event) => {
      context.pos = 16;
      await zoom(context.pos)
      await sleep(2000)
      await setFocus(zoom_to_focus['halfzoom'])
    },
    narrowzoom: async (context,event) => {
      context.pos = 31;
      await zoom(context.pos)
      await sleep(2000)
      await setFocus(zoom_to_focus['narrowzoom'])
    },
    widezoom: async (context,event) => {
      context.pos = 0;
      await zoom(context.pos)
      await sleep(2000)
      await setFocus(zoom_to_focus['widezoom'])
    },
    zoomin: async (context,event) => {
      context.pos = Math.min(context.pos+1,31);
      await zoom(context.pos)
    },
    zoomout: async (context,event) => {
      context.pos = Math.max(context.pos-1,0);
      await zoom(context.pos)
    }
  }
}


// Machine instance with internal state
const initialContext = {
  pos: 0
};


const cameraObservable = new Observable(sub => {
  const cameraService = interpret(Machine({
    context: initialContext,
    initial: 'initialize',
    states: cameraStates
    },cameraImp))
    .onTransition(state => console.log("Current State: " + state.value) || sub.next({state: state.value, service: cameraService}))
    .start();
})


var cameraReady = cameraObservable.pipe(
   filter(s => s.state === 'idle')
   ,first());

//cameraReady.subscribe(s => {
//  s.service.send('zoomin')
//})
// => 'inactive'

//cameraService.send('right');
// => 'active'

//cameraService.send('TOGGLE');
// => 'inactive'

module.exports = {
  ready: cameraReady,
  isRecording: isRecording,
  startRecord: startRecord,
  stopRecord: stopRecord,
  storage: storage,
  getFocus: getFocus
}
