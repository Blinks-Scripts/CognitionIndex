import React from 'react';

export const TextTranscription: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div>
      <p>{text}</p>
    </div>
  );
};
