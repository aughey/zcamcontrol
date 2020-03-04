import React from 'react';
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

function Stream(props) {
  return (<img src="/stream" alt="stream"/>)
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
	<Stream/>
    </div>
  );
}

export default App;
