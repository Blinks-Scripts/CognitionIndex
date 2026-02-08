import React from 'react';
import { convertBlobToMp3 } from '../utils/audioUtils';
import { TextTranscription } from './TextTranscription';
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

  return (
    <div>
      <TranscribeAudio transcribe={handleTranscribe} />
      <RecordAudio setAudio={setAudio} show={method === 'record'} mp3Blob={mp3Blob} />
      <UploadAudio setFile={setFile} show={method === 'upload'} />
      <button onClick={() => setMethod(method === 'upload' ? 'record' : 'upload')}>
        {method === 'upload' ? 'Record' : 'Upload'}
      </button>
    </div>
  );
};
