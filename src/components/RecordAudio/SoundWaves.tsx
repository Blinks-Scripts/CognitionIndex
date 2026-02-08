import React from 'react';

export const SoundWaves: React.FC<{ recording: boolean; hasAudio: boolean }> = ({ recording, hasAudio }) => {
  // shows vibrating sound waves while recording, shows a static looking sound wave when it has audio captured and recording is done
  if (recording) {
    return (
      <div>
        recording...
      </div>
    );
  }
  if (hasAudio && !recording) {
    return (
      <div>
        audio captured
      </div>
    );
  }
  if (!hasAudio && !recording) {
    return (
      <div>
        no audio captured
      </div>
    );
  }
  return null;
};
