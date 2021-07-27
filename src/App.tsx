import React from 'react';
import { TopNavBar } from './TopNavBar';
import { FixtureEditor } from './FixtureEditor/FixtureEditor';
import './App.css';

const App : React.FC = () => {
  return (
    <div className="App">
      <TopNavBar />
      <div className="DisplayArea">
        <FixtureEditor />
      </div>
    </div>
  );
}

export default App;
