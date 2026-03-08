import React from "react";
import { Composition } from "remotion";
import { FocusTabsDemo } from "./FocusTabsDemo";

export const Root: React.FC = () => {
  return (
    <Composition
      id="FocusTabsDemo"
      component={FocusTabsDemo}
      durationInFrames={900}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
