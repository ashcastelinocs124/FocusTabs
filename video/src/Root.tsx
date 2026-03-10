import React from "react";
import { Composition } from "remotion";
import { FocusTabsDemo } from "./FocusTabsDemo";

export const Root: React.FC = () => {
  return (
    <Composition
      id="FocusTabsDemo"
      component={FocusTabsDemo}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
