import React, { useCallback } from 'react';
import { SoundWaves } from './SoundWaves';
import { RecordingInterface } from './RecordingInterface';
import { PlaybackInterface } from './PlaybackInterface';
import { DownloadInterface } from './DownloadInterface';

export const RecordAudio: React.FC<{
  setAudio: (audio: Blob) => void;
  show: boolean;
  mp3Blob: Blob | null;
}> = ({ setAudio, show, mp3Blob }) => {
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const audioStream = React.useRef<HTMLAudioElement | null>(null);
  const audioChunks = React.useRef<Blob[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [hasAudio, setHasAudio] = React.useState(false);
  const [audioIsPlaying, setAudioIsPlaying] = React.useState(false);

  const record = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(mediaStream);
    audioChunks.current = [];
    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };
    mediaRecorder.current.onstop = () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      setAudio(audioBlob);
    };
    mediaRecorder.current.start();
    setRecording(true);
    setHasAudio(true);
  };

  const stop = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    // release the microphone
    mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }, []);

  const pause = useCallback(() => {
    if (audioStream.current && !audioStream.current.paused) {
      audioStream.current.pause();
      setAudioIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioStream.current && audioStream.current.paused) {
      audioStream.current.play();
    }
  }, []);

  const play = useCallback(() => {
    const audio = new Audio(URL.createObjectURL(audioChunks.current[audioChunks.current.length - 1]));
    audioStream.current = audio;
    setAudioIsPlaying(true);
    audio.play();
  }, []);

  return (
    <div style={{ display: show ? 'block' : 'none' }}>
      <SoundWaves recording={recording} hasAudio={hasAudio} />
      <RecordingInterface recording={recording} record={record} stop={stop} />
      <PlaybackInterface audioIsPlaying={audioIsPlaying} play={play} pause={pause} resume={resume} />
      <DownloadInterface mp3Blob={mp3Blob} />
    </div>
  );
};
