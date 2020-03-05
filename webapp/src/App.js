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

function RecordIndicator(props) {
  var [recording,setRecording] = useState(false)
  useEffect(() => {
    var timer = null;
    async function query() {
      timer = null;
      var recording = await axios.get("/camera/isRecording");
      console.log(recording.data)
      setRecording(recording.data)
      timer = setTimeout(query,1000)
    }
    query()
    return () => {
      clearTimeout(timer);
    }
  },[]);

  return (
    <div className={recording ? "recording" : "notrecording"}>{recording ? "Recording" : "Not Recording"}</div>
  )
}

function Stream(props) {
  var [show,setShow] = useState(false)

  var stream = null;
  if(show) {
    stream = (<img src="/stream" alt="stream"/>)
  }

  return (
  <div>
    <div>
    Show stream: <input type="checkbox" onChange={_ => setShow(!show)} checked={show}/>
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
      </div>
      <div>
 	<DirectionButton prefix="/camera" dir="focus"/>
 	<DirectionButton prefix="/camera" dir="focusin"/>
 	<DirectionButton prefix="/camera" dir="focusout"/>
      </div>
      <div>
        Record:
        <DirectionButton prefix="/camera/record/" dir="start"/>
        <DirectionButton prefix="/camera/record/" dir="stop"/>
        <RecordIndicator/>
      </div>
	<Stream/>
    </div>
  );
}

export default App;
