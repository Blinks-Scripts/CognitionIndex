import React from 'react';

export const DownloadInterface: React.FC<{ mp3Blob: Blob | null }> = ({ mp3Blob }) => {
  const [recordingName, setRecordingName] = React.useState('');
  return (
    <div>
      <input
        type="text"
        placeholder="Recording Name"
        onChange={(e) => setRecordingName(e.target.value)}
      />
      <a
        href={mp3Blob ? URL.createObjectURL(mp3Blob) : ''}
        download={recordingName + '.mp3'}
      >
        Download
      </a>
    </div>
  );
};
