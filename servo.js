import { Machine, interpret } from 'xstate';
const util = require('util')
const { spawn } = require('child_process')
import { Observable } from 'rxjs'
import { first,filter,tap } from 'rxjs/operators'

function makeDir(dir) {
  return {
    target: 'move',
    actions: function() {
      console.log("setting directio to " + dir);
    }
  }
}

// Stateless machine definition
// machine.transition(...) is a pure function used by the interpreter.
const servoStates = {
    initialize: { 
      invoke: {
        src: 'initialize',
	onDone: 'idle'
      }
    },
    idle: { 
      on: { 
	left: 'startMove',
	right: 'startMove',
	up: 'startMove',
	down: 'startMove'
	} },
    startMove: {
      invoke: {
        src: 'doMove',
	onDone: 'moving'
      }
    },
    moving: {
      invoke: {
        src: 'moveTimer',
	onDone: 'stop'
      }
    },
    stop: {
      invoke: {
        src: 'doStop',
	onDone: 'idle',
      }
    }
};

async function runGPIO(commands) {
  console.log("Running GPIO: " + commands.join(' '))
  const prog = spawn('gpio', commands)
  for await (const data of prog.stdout) {
    //console.log(data.toString())
  }
//  console.log("Done running")
}

function setGPIO(pin,highlow) {
   //  -g mode 13 out ; gpio -g write 13 0
   return runGPIO(['-g','write',pin,highlow.toString()])
}

async function setupGPIO(pin) {
   await runGPIO(['-g','mode',pin,'out'])
   await setGPIO(pin,0)
}

async function asyncSleep(seconds) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}

const servoImp = {
  services: {
    initialize: async function(context,event) {
      let gpio = context.gpio
      for(let direction in gpio) {
        await setupGPIO(gpio[direction])
      }
    },
    moveTimer: async () => {
      await asyncSleep(0.1)
    },
    doMove: async (context,event) => {
      let gpio = context.gpio;
      let dir = event.type
      let pin = gpio[dir]
      context.movingpin = pin
      await setGPIO(pin,1)
    },
    doStop: async (context,event) => {
      await setGPIO(context.movingpin,0)
    }
  }
}


// Machine instance with internal state
const initialContext = {
  gpio: {
    down: 13,
    up: 17,
    right: 26,
    left: 22
  }
};


const servoObservable = new Observable(sub => {
  const servoService = interpret(Machine({
    context: initialContext,
    initial: 'initialize',
    states: servoStates
    },servoImp))
    .onTransition(state => console.log("Current State: " + state.value) || sub.next({state: state.value, service: servoService}))
    .start();
})


var servoReady = servoObservable.pipe(
   filter(s => s.state === 'idle')
   ,first());

//servoReady.subscribe(s => {
//  s.service.send('right')
//})
// => 'inactive'

//servoService.send('right');
// => 'active'

//servoService.send('TOGGLE');
// => 'inactive'

module.exports = {
  ready: servoReady
}
