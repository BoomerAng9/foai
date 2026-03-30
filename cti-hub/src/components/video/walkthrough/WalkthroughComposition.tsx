'use client';

import React from 'react';
import { Composition } from 'remotion';
import { Scene1Platform } from './Scene1Platform';
import { Scene2Acheevy } from './Scene2Acheevy';
import { Scene3Chat } from './Scene3Chat';
import { Scene4ImageGen } from './Scene4ImageGen';
import { Scene5LUC } from './Scene5LUC';
import { Scene6aMarket } from './Scene6aMarket';
import { Scene6bBuild } from './Scene6bBuild';
import { Scene6cScale } from './Scene6cScale';
import { Scene7Feedback } from './Scene7Feedback';

const DURATION = 750;
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const scenes = [
  { id: 'Scene1', component: Scene1Platform, title: 'What is Deploy Platform' },
  { id: 'Scene2', component: Scene2Acheevy, title: 'Meet ACHEEVY' },
  { id: 'Scene3', component: Scene3Chat, title: 'How to Chat' },
  { id: 'Scene4', component: Scene4ImageGen, title: 'Image Generation' },
  { id: 'Scene5', component: Scene5LUC, title: 'Cost Tracking' },
  { id: 'Scene6a', component: Scene6aMarket, title: 'Find Your Market' },
  { id: 'Scene6b', component: Scene6bBuild, title: 'Build Without Limits' },
  { id: 'Scene6c', component: Scene6cScale, title: 'Scale to the Moon' },
  { id: 'Scene7', component: Scene7Feedback, title: 'Give Us Feedback' },
] as const;

export const SCENE_CONFIG = {
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export const WalkthroughRoot: React.FC = () => {
  return (
    <>
      {scenes.map((scene) => (
        <Composition
          key={scene.id}
          id={scene.id}
          component={scene.component}
          durationInFrames={DURATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </>
  );
};
