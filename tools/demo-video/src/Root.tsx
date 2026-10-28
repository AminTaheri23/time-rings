import React from 'react';
import { Composition } from 'remotion';
import { Demo, FPS, BAR } from './Demo';
import timeline from '../timeline.json';

// pipStart / pipEnd (seconds into the footage) come from public/footage.json, passed with --props
export const Root: React.FC = () => (
  <Composition
    id="Demo"
    component={Demo}
    fps={FPS}
    width={1280}
    height={800}
    durationInFrames={Math.round(timeline.bars * BAR * FPS)}
    defaultProps={{ pipStart: null, pipEnd: null }}
  />
);
