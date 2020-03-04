var servo = require('./servo')
var camera = require('./camera')
var express = require('express')
var http = require('http')
const { spawn } = require('child_process')

async function runCommand(command,args) {
  console.log(command + " " + args.join(' '))
  const prog = spawn(command,args)
  var buffers = []
  for await (const data of prog.stdout) {
    console.log("Got buffer")
    console.log(data)
    buffers.push(data)
  }
  return Buffer.concat(buffers)
}

function self_proxy(url, res) {
  var request = http.get(url, (resp) => {
    var first = true
    resp.on('data', chunk => {
      if (first) {
        first = false
        Object.keys(resp.headers).forEach(k => {
          res.set(k, resp.headers[k])
        })
        //res.set('content-type', resp.headers['content-type'])
      }
      res.write(chunk)
    })
    resp.on('end', () => {
      console.log("source closed");
      res.end()
    })
    res.on('close', () => {
      console.log("remote closed");
      request.abort();
    });
  }).on('error', (err) => {
    res.send(err.message);
    res.end()
  })
}


servo.ready.subscribe(s => {
  var app = express();
  var service = s.service;
  
  camera.ready.subscribe(c => {
    var cameraservice = c.service

  app.post("/direction/:dir", async (req,res) => {
    service.send(req.params.dir)
    res.send("OK")
  });

  app.post("/camera/:dir", async (req,res) => {
    cameraservice.send(req.params.dir)
    res.send("OK")
  });

  app.get("/stream", (req,res) => {
    self_proxy("http://10.0.0.36/mjpeg_stream",res)
  });

  app.get("/snapshot", async (req,res) => {
    // avconv -loglevel quiet  -f MJPEG -y -i http://10.0.0.36/mjpeg_stream -vframes 1 -q:v 1 pipe:.jpg 
    var data = await runCommand('avconv',
       ['-loglevel','quiet','','-f','MJPEG','-y','-i','http://10.0.0.36/mjpeg_stream','-vframes','1','-q:v','1','pipe:.jpg'])
    console.log(data)
    res.type("jpeg")
    res.send(data);
  });

  app.listen(4000, () => {
    console.log("Server listening...")
  });
})

})