import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { Scene1Platform } from '../components/video/walkthrough/Scene1Platform';
import { Scene2Acheevy } from '../components/video/walkthrough/Scene2Acheevy';
import { Scene3Chat } from '../components/video/walkthrough/Scene3Chat';
import { Scene4ImageGen } from '../components/video/walkthrough/Scene4ImageGen';
import { Scene5LUC } from '../components/video/walkthrough/Scene5LUC';
import { Scene6aMarket } from '../components/video/walkthrough/Scene6aMarket';
import { Scene6bBuild } from '../components/video/walkthrough/Scene6bBuild';
import { Scene6cScale } from '../components/video/walkthrough/Scene6cScale';
import { Scene7Feedback } from '../components/video/walkthrough/Scene7Feedback';

const DURATION = 750;
const FPS = 30;
const W = 1920;
const H = 1080;

const Root: React.FC = () => (
  <>
    <Composition id="Scene1-Platform" component={Scene1Platform} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene2-ACHEEVY" component={Scene2Acheevy} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene3-Chat" component={Scene3Chat} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene4-ImageGen" component={Scene4ImageGen} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene5-LUC" component={Scene5LUC} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene6a-Market" component={Scene6aMarket} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene6b-Build" component={Scene6bBuild} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene6c-Scale" component={Scene6cScale} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Scene7-Feedback" component={Scene7Feedback} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
  </>
);

registerRoot(Root);
