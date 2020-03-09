import { Observable, Subject, fromEvent } from 'rxjs';
import { map, tap, publish, refCount, switchMap, take, finalize, buffer } from 'rxjs/operators';
//import { Throttle } from 'stream-throttle'
import { writeFileSync } from 'fs';

const ffroot = '/home/pi/ffmpeg-4.2.2-armhf-static'

const { spawn } = require('child_process');
const sharp = require('sharp')

async function pipeAll(command, args) {
    const prog = spawn(command, args)
    var buffers = []
    for await (const data of prog.stdout) {
        buffers.push(data)
    }
    prog.stdout.destroy();
    prog.stdin.destroy();
    prog.stderr.destroy()
    return Buffer.concat(buffers)
}

function spawnRX(command, args) {
    return new Observable(ob => {
        console.log(command + " " + args.join(' '))
        const prog = spawn(command, args);
        prog.on('close', _ => console.log("Completing " + command) || ob.complete());
        ob.next(prog)
        return () => {
            console.log("Shutting down: " + command);
         
          setTimeout(() => {
                prog.stdin.destroy();
           prog.stdout.destroy();
           prog.stderr.destroy()
        },1);
        }
    })
}

// /c/jha/ffmpeg-4.2.1-win64-shared/bin/ffmpeg.exe -hide_banner -loglevel panic -fflags nobuffer -flags low_delay -i concat.mp4 -f rawvideo -vcodec rawvideo pipe:1 

function ffmpegRx(path) {
    const ffprobe = ffroot + '/ffprobe'
    var ffmpeg_exe = ffroot + '/ffmpeg'
    var ffmpeg_args = "-hide_banner -loglevel panic -fflags nobuffer -flags low_delay -f rawvideo -vcodec rawvideo -pix_fmt rgb24 pipe:1"
    ffmpeg_args = ffmpeg_args.split(' ');
    ffmpeg_args.push("-i");
    ffmpeg_args.push(path)


    return spawnRX(ffprobe,["-v", "quiet", "-print_format", "json", "-show_streams", path]).pipe(
        switchMap(prog => MyStreamToRX(prog.stdout).pipe(buffer(fromEvent(prog.stdout,'end')))),
        map(buffers => Buffer.concat(buffers)),
        map(buffer => JSON.parse(buffer)),
        map(data => data.streams.find(s => s.codec_type === 'video')),
        map(video => ({
            width: video.width,
            height: video.height
        })),
        // Got the info, now spawn of ffmpeg
        tap(data => console.log(data)),
        switchMap(payload => spawnRX(ffmpeg_exe,ffmpeg_args).pipe(
            switchMap(ffprog => rxCollectBufferSize(MyStreamToRX(ffprog.stdout), payload.width * payload.height * 3, payload)),
        ))
    )

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

var url = process.argv[2]

var framestream = RefCountSlowStartSubject(ffmpegRx(url), 1000);

framestream.pipe(
    take(3)
).subscribe(async buf => {
    var image = sharp(buf.data, { raw: { width: buf.width, height: buf.height, channels: 3 } })
    var imagedata = await image.png().toBuffer();
    writeFileSync("image.png", imagedata);
    console.log("Wrote image file");
});

framestream.subscribe(_ => {
  console.log("Got frame")
})

// setTimeout(() => {
//     console.log("Slow subscribe getting one buffer")
//     framestream.pipe(take(1)).subscribe(buf => {
//         console.log("slow subscribe got buffer")
//     })
// }, 3000)

// Turns an observable that is slow to start into a referenced counted
// subject
function RefCountSlowStartSubject(observable, msdelay) {
    var subject = new Subject();
    var refcount = 0;
    var sub = null;

    var shutdownTimeout;

    function deref() {
        refcount--;
        if (refcount === 0) {
            console.log("refcount 0, shutting down");
            shutdownTimeout = setTimeout(() => {
                console.log("Actually shutting down");
                sub.unsubscribe();
                sub = null;
                shutdownTimeout = null;
            }, msdelay)
        }
    }

    var myob = new Observable(ob => {
        refcount++;
        if (!sub) {
            console.log("first subscribe, startting up")
            sub = observable.subscribe(value => subject.next(value))
        }
        if (shutdownTimeout) {
            console.log("Stopping shutdown")
            clearTimeout(shutdownTimeout);
            shutdownTimeout = null;
        }
        ob.next(null)
        return deref
    })

    return myob.pipe(
        switchMap(_ => subject)
    )
}

function rxCollectBufferSize(stream, fixed_size, payload) {
    return new Observable(observer => {
        var buffers = [];
        var size = 0;

        var unsub = stream.subscribe(data => {
            while (size + data.length >= fixed_size) {
                var over = (size + data.length) - fixed_size
                // chop the last one
                var datause = data.subarray(0, data.length - over)
                data = data.subarray(data.length - over)

                buffers.push(datause);
                var concat = Buffer.concat(buffers)
                observer.next(Object.assign(payload, {
                    data: concat
                }))
                buffers = []
                size = 0
            }
            buffers.push(data)
            size += data.length
        },
            err => { },
            complete => observer.complete()
        );
        return () => {
            console.log("Rx collect buffer size shutting down")
            unsub.unsubscribe();
        }
    })
}
