import React, { useState,useEffect } from 'react';
import './App.css';
import axios from 'axios'

function sendCommand(prefix,dir) {
  axios.post(prefix + "/" + dir);
}

function DirectionButton(props) {
  let name = props.dir
  name = name.charAt(0).toUpperCase() + name.slice(1)
  var prefix = props.prefix || "/direction"
  return (
   <button onClick={_ => sendCommand(prefix,props.dir)}>{name}</button>
  )
}

function useTimeout(callback,ms) {
  useEffect(() => {
	  var timer = null;
	  var reschedule = () => {
	    setTimeout(() => {
	      timer = null;
	      callback(reschedule)
	    }, ms)
	  }
	  reschedule()
	  return () => {
	    clearTimeout(timer);
	  }
  },[])
}

function DoubleCheckButton(props) {
  var text = props.text;
  var klass = 'nothing'
  var [state,setState] = useState(0)

  if(state === 1) {
     text = "Are you sure?"
  } else if(state === 2) {
     text = "Are you really sure?"
  } else if(state >= 3) {
     text = props.activeText;
  }

  function click() {
    setState(s => s + 1)
    if(state === 0) {
      setState(1)
      setTimeout(() => {
        setState(0)
      },2000);
    }
  }

  useEffect(() => {
    if(state === 3) {
      props.onClick()
    }
  },[state])


  return (<button onClick={click} className={klass}>{text}</button>)
}

function useGetDataPeriodically(url,ms) {
  if(!ms) {
    ms = 1000
  }
  var [data,setData] = useState(null)
  useTimeout(async reschedule => {
      var d = null;
      try {
        d = await axios.get(url)
      } catch(e) {
        console.log(e)
        d = {data: null}
      }
      setData(d.data)
      reschedule()
  }, ms);
  return data;
}

function FocusIndicator(props) {
  var focus = useGetDataPeriodically("/camera/getFocusPos",1000);
  return (<pre>{JSON.stringify(focus)}</pre>)
}

function RecordIndicator(props) {
  var recording = useGetDataPeriodically("/camera/isRecording",1000);

  var r = recording;
  if(!r) {
     r = { }
  }

  return (
    <div className={r.isRecording ? "recording" : "notrecording"}>{r.isRecording ? "Recording" : "Not Recording"} {JSON.stringify(r.storage)}</div>
  )
}

function StreamImage(props) {
   var [imagenum,setImageNum] = useState(4)
   function bump() {
     setImageNum(prev => prev + 1)
   }
   useEffect(() => {
     var i = setInterval(bump,2000)
     return () => {
        console.log("Clearning interval");
 	clearInterval(i);
     }
   },[]);
    return (
<div className={props.canZoom ? "streamdiv" : "zzzstreamdiv"}>
<img src={"/snapshot?rand=" +imagenum } alt="stream"/>
</div>
)
}

function FormatButton() {
  function format() {
    sendCommand('camera','format');
  }
  return (<DoubleCheckButton onClick={format} text="Format Card" activeText="Formatting"/>)
}

function Stream(props) {
  var [show,setShow] = useState(false)
  var [canZoom,setCanZoom] = useState(false)


  var stream = null;
  if(show) {
    stream = (<StreamImage canZoom={canZoom}/>)
  }

  return (
  <div>
    <div>
    Show stream: <input type="checkbox" onChange={_ => setShow(!show)} checked={show}/>
    Can Zoom: <input type="checkbox" onChange={_ => setCanZoom(!canZoom)} checked={canZoom}/>
    </div>
    {stream}
  </div>
  )
  return null
}

function App() {
  return (
    <div className="App">
      <div className="direction">
 	<DirectionButton dir="up"/><br/>
 	<DirectionButton dir="left"/>
 	<DirectionButton dir="right"/><br/>
 	<DirectionButton dir="down"/>
      </div>
      <div>
 	<DirectionButton prefix="/camera" dir="zoomin"/>
 	<DirectionButton prefix="/camera" dir="zoomout"/>
 	<DirectionButton prefix="/camera" dir="widezoom"/>
 	<DirectionButton prefix="/camera" dir="halfzoom"/>
 	<DirectionButton prefix="/camera" dir="narrowzoom"/>
      </div>
      <div>
 	<DirectionButton prefix="/camera" dir="focus"/>
 	<DirectionButton prefix="/camera" dir="focusin"/>
 	<DirectionButton prefix="/camera" dir="focusout"/>
      </div>
	<FocusIndicator/>
      <div>
        Record:
        <DirectionButton prefix="/camera/record/" dir="start"/>
        <DirectionButton prefix="/camera/record/" dir="stop"/>
        { false ? "" : <RecordIndicator/> }
        <FormatButton/>
      </div>
	<Stream/>
    </div>
  );
}

export default App;
