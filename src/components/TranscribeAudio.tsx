import React from 'react';

export const TranscribeAudio: React.FC<{
  transcribe: () => void
}> = ({ transcribe }) => {
  const handleClick = () => {
    transcribe();
  };

  return (
    <div>
      <button onClick={handleClick}>Transcribe</button>
    </div>
  );
};
