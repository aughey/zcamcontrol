import { Observable, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';


// Turns an observable that is slow to start into a referenced counted
// subject
export function refCountSlowStartSubject(observable, msdelay) {
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
