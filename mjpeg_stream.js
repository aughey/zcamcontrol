import { Observable } from 'rxjs';
import {  switchMap } from 'rxjs/operators';
//import { Throttle } from 'stream-throttle'
import { streamToRX } from './streamToRX'
const axios = require('axios')

function getURLRX(url) {
    return new Observable(ob => {
        var cancel = axios.CancelToken.source();
        var request = axios.get(url, { responseType: 'stream', cancelToken: cancel.token })
        request.then(res => ob.next(res))
        return () => {
            cancel.cancel();
        }
    })
}

function mjpegStreamRx(url) {
    return getURLRX(url).pipe(
        switchMap(res => streamToRX(res.data)),
        extractMultipart()
    )
}

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
                            accum = accum.subarray(headend + 4);

                            var contentlength = header.find(v => v.startsWith("Content-Length:"))
                            if (!contentlength) {
                                work_performed = true;
                                continue
                            }
                            var [_, len] = contentlength.split(' ');
                            datalen = parseInt(len, 10);

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

exports.mjpegStreamRx = mjpegStreamRx;
