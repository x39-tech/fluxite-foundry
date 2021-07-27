import React from 'react';
import { FixtureEditorSidebar } from './FixtureEditorSidebar';
import { FixtureDisplayArea } from './FixtureDisplayArea';
import './FixtureEditor.css'

export const FixtureEditor : React.FC = () => {
  return (
    <div className="FixtureEditor">
      <FixtureEditorSidebar />
      <FixtureDisplayArea />
    </div>
  )
}
