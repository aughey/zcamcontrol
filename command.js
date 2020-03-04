var servo = require('./servo')

console.log(process.argv)

var direction = process.argv[2]

servo.ready.subscribe(s => {
  s.service.send(direction)
})
