var servo = require('./servo')
var express = require('express')
var http = require('http')

function self_proxy(url, res) {
  http.get(url, (resp) => {
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
      res.end()
    })
  }).on('error', (err) => {
    res.send(err.message);
    res.end()
  })
}


servo.ready.subscribe(s => {
  var app = express();
  var service = s.service;

  app.post("/direction/:dir", async (req,res) => {
    service.send(req.params.dir)
  });

  app.get("/stream", (req,res) => {
    self_proxy("http://10.0.0.36/mjpeg_stream",res)
  });

  app.listen(4000, () => {
    console.log("Server listening...")
  });

})
