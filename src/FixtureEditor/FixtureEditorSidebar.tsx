import React from 'react';
import Collapsible from 'react-collapsible';
import './FixtureEditorSidebar.css'

export const FixtureEditorSidebar : React.FC = () => {
  return (
    <div className="FixtureEditorSidebar">
      <Collapsible trigger="Sidebar Placeholder">
      </Collapsible>
    </div>
  );
}

