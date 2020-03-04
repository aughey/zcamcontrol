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
	focus: 'focus',
	focusin: 'focusin',
	focusout: 'focusout'
}
	},
    focus: invokeCommand('focus'),
    focusin: invokeCommand('focusin'),
    focusout: invokeCommand('focusout'),
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

async function sendCommand(command) {
  var url = camera_url + command;
  console.log("Sending camera: " + url)
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

async function incrFocus(percent) {
      var focusvalue = await getParam('lens_focus_pos')
	var diff = focusvalue.max - focusvalue.min
 	var value = Math.round(focusvalue.value + diff * percent)
	value = Math.min(value,focusvalue.max)
	value = Math.max(value,focusvalue.min)

      await sendCommand("/ctrl/set?lens_focus_pos=" + value)
}

const cameraImp = {
  services: {
    initialize: async function(context,event) {
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
      return incrFocus(0.1)
    },
    focusout: async () => {
      return incrFocus(-0.1)
    },
    widezoom: async (context,event) => {
      context.pos = 0;
      await zoom(context.pos)
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
  ready: cameraReady
}
