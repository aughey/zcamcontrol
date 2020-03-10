import { Observable } from 'rxjs';

function MyStreamToRX(stream) {
    return new Observable(ob => {
        function reader(d)  {
            ob.next(d);
        }
        stream.on('data', reader);
        stream.on('end', _ => {
            ob.complete();
        })
        return () => {
            stream.removeListener('data',reader)
        }
    })
}

exports.streamToRX = MyStreamToRX;