import React from 'react';
import { convertBlobToMp3 } from '../utils/audioUtils';
import { TranscribeAudio } from './TranscribeAudio';
import { RecordAudio } from './RecordAudio/RecordAudio';
import { UploadAudio } from './UploadAudio';

export const UserInput: React.FC<{
  setText: (text: string) => void;
  transcribeFn: (audio: Blob | null, file: File | null) => Promise<any>;
}> = ({ setText, transcribeFn }) => {
  const [audio, setAudio] = React.useState<Blob | null>(null);
  const [mp3Blob, setMp3Blob] = React.useState<Blob | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [method, setMethod] = React.useState<'upload' | 'record'>('upload');

  const handleTranscribe = React.useCallback(async () => {
    if (method === 'upload') {
      if (!file) {
        return;
      }
      const textResponse = await transcribeFn(null, file);
      if (textResponse) {
        console.log('Transcription:', textResponse);
        setText(textResponse.text);
      }
    } else {
      if (!mp3Blob) {
        return;
      }
      const textResponse = await transcribeFn(mp3Blob, null);
      if (textResponse) {
        console.log('Transcription:', textResponse);
        setText(textResponse.text);
      }
    }
  }, [method, file, mp3Blob, transcribeFn, setText]);

  React.useEffect(() => {
    const convert = async (audio: Blob) => {
      const mp3Blob = await convertBlobToMp3(audio);
      if (mp3Blob instanceof Blob) {
        setMp3Blob(mp3Blob);
      }
    };
    if (audio) {
      convert(audio);
    }
  }, [audio]);

  React.useEffect(() => {
    if (!mp3Blob && !file) {
      return;
    }
    handleTranscribe();
  }, [mp3Blob, file]);

  const [manualText, setManualText] = React.useState('');

  const handleManualSubmit = () => {
    if (manualText.trim()) {
      setText(manualText);
      setManualText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <h4>Manual Text Entry</h4>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Paste or type conversation text here..."
          style={{ width: '100%', minHeight: '100px', padding: '8px', marginBottom: '10px' }}
        />
        <button onClick={handleManualSubmit} disabled={!manualText.trim()}>
          Submit Text
        </button>
      </div>

      <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <h4>Audio Input</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => setMethod('upload')} style={{ fontWeight: method === 'upload' ? 'bold' : 'normal' }}>
            Upload
          </button>
          <button onClick={() => setMethod('record')} style={{ fontWeight: method === 'record' ? 'bold' : 'normal' }}>
            Record
          </button>
        </div>

        {method === 'upload' ? (
          <UploadAudio setFile={setFile} show={true} />
        ) : (
          <RecordAudio setAudio={setAudio} show={true} mp3Blob={mp3Blob} />
        )}

        <div style={{ marginTop: '10px' }}>
          <TranscribeAudio transcribe={handleTranscribe} />
        </div>
      </div>
    </div>
  );
};
