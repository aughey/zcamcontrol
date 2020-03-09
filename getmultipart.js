import { Observable, Subject, fromEvent } from 'rxjs';
import { map, tap, publish, refCount, switchMap, take, finalize, buffer, flatMap } from 'rxjs/operators';
//import { Throttle } from 'stream-throttle'
import { writeFileSync, fstat, statSync, writeFile } from 'fs';
import sharp from 'sharp';
const axios = require('axios')

function getURLRX(url) {
    return new Observable(async ob => {
        ob.next(await axios.get(url, { responseType: 'stream' }))
    })
}

function MyStreamToRX(stream) {
    return new Observable(ob => {
        function reader(d)  {
            ob.next(d);
        }
        stream.on('data', reader);
        stream.on('end', _ => {
            console.log("mystreamtorx stream ending");
            ob.complete();
        })
        return () => {
            console.log("mystreamtorx shutting down")
            stream.removeListener('data',reader)
        }
    })
}

//const url = 'http://50.240.207.30/mjpg/video.mjpg'
const url = 'http://10.0.0.36/mjpeg_stream'
var index = 0;
getURLRX(url).pipe(
    switchMap(res => MyStreamToRX(res.data)),
    extractMultipart(),
//    tap(buf => writeFileSync('test' + (index++) + ".jpg",buf)),
    map(buf => sharp(buf)),
).subscribe(async image => {
    var imagedata = await image.png().toBuffer();
    writeFileSync("image.png", imagedata);
})

function extractMultipart() {
    return function (source) {
        var accum = Buffer.alloc(0)
        return new Observable(ob => {
            var read_header = true;
            var datalen = 0;

            var unsub = source.subscribe(buf => {
                accum = Buffer.concat([accum, buf])
                var work_performed = true;
                while (work_performed) {
                    work_performed = false;
                    if (read_header) {
                        var headend = accum.indexOf("\r\n\r\n")
                        if (headend >= 0) {
                            var header = accum.subarray(0, headend).toString().split("\r\n")
                            accum = accum.subarray(headend+4);
                            console.log(header)

                            var contentlength = header.find(v => v.startsWith("Content-Length:"))
                            if(!contentlength) {
                                work_performed = true;
                                continue
                            }
                            var [_, len] = contentlength.split(' ');
                            datalen = parseInt(len, 10);
                            console.log(datalen)

                            read_header = false;
                            work_performed = true;
                        }
                    } else {
                        if (accum.length >= datalen) {
                            var data = accum.subarray(0, datalen)
                            accum = accum.subarray(datalen)
                            ob.next(data)
                            read_header = true;
                            work_performed = true;
                        }
                    }
                }
            })
            return () => unsub.unsubscribe();
        })
    }
}

async function run() {
    console.log("Getting: " + url)
    var res = await axios.get(url, { responseType: 'stream' })

    var stream = res.data;

    // Header
    var prev = Buffer.alloc(0);
    while (true) {
        console.log("TOP")
        var header = [];
        for await (const chunk of stream) {
            console.log(chunk.length)
            prev = Buffer.concat([prev, chunk]);
            var headend = prev.indexOf("\r\n\r\n")
            if (headend >= 0) {
                var header = prev.subarray(0, headend).toString().split("\r\n")
                console.log("--")
                console.log(header)
                console.log("--")
                prev = prev.subarray(headend);
                break
            }
        }

        var contentlength = header.find(v => v.startsWith("Content-Length:"))
        var [_, len] = contentlength.split(' ');
        len = parseInt(len, 10);
        console.log(len)

        while (prev.length < len) {
            console.log(prev.length)
            for await (const chunk of stream) {
                console.log(" " + chunk.length)
                prev = Buffer.concat([prev, chunk])
                break;
            }
        }
        console.log("FOO")
        var buffer = prev.subarray(0, len);
        prev = prev.subarray(len)
        console.log(buffer.length)
        console.log("buttom")
    }
}

//run();