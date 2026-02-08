import React from 'react';

export const PlaybackInterface: React.FC<{
  audioIsPlaying: boolean;
  play: () => void;
  pause: () => void;
  resume: () => void;
}> = ({ audioIsPlaying, play, pause, resume }) => {
  return (
    <div>
      {!audioIsPlaying && <button onClick={play}>Play / Resume</button>}
      {audioIsPlaying && <button onClick={pause}>Pause</button>}
    </div>
  );
};
