import React from 'react';

export const RecordingInterface: React.FC<{
  recording: boolean;
  record: () => void;
  stop: () => void;
}> = ({ recording, record, stop }) => {
  return (
    <div>
      <button onClick={record}>Record</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
};
