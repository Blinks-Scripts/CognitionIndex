import React from 'react';

export const UploadAudio: React.FC<{
  setFile: (file: File) => void;
  show: boolean;
}> = ({ setFile, show }) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  return (
    <div style={{ display: show ? 'block' : 'none' }}>
      <input type="file" accept="audio/*" onChange={handleFileUpload} />
    </div>
  );
};
