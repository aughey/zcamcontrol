import React from 'react';
import './App.css';
import axios from 'axios'

function sendCommand(dir) {
  axios.post("/direction/" + dir);
}

function DirectionButton(props) {
  let name = props.dir
  name = name.charAt(0).toUpperCase() + name.slice(1)
  return (
   <button onClick={_ => sendCommand(props.dir)}>{name}</button>
  )
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
	<img src="/stream" alt="stream"/>
    </div>
  );
}

export default App;
