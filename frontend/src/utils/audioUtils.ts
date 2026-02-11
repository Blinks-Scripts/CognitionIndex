import { Mp3Encoder } from '@breezystack/lamejs';

export const AUDIO_TO_TEXT_API = 'https://api.openai.com/v1/audio/transcriptions';

export const convertBlobToMp3 = async (blob: Blob): Promise<Blob> => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const mp3encoder = new Mp3Encoder(1, audioBuffer.sampleRate, 128); // Mono, sample rate, 128kbps
  const samples = audioBuffer.getChannelData(0);
  const sampleBlockSize = 1152; // must be multiple of 576

  // Convert Float32 to Int16
  const mp3Data = [];
  const converted = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // scale to 16-bit signed int
    const s = Math.max(-1, Math.min(1, samples[i]));
    converted[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  let remaining = converted.length;
  for (let i = 0; remaining >= sampleBlockSize; i += sampleBlockSize) {
    const mono = converted.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(mono);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    remaining -= sampleBlockSize;
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data as any[], { type: 'audio/mp3' });
};

export const sendForTranscription = async (audio: Blob | null, file: File | null, openaiKey: string) => {
  const formData = new FormData();
  if ((!audio && !file) || (audio && file)) {
    (audio && file) && console.error('Either mp3 blob or file must be provided, but not both');
    (!audio && !file) && console.error('Either mp3 blob or file must be provided');
    return null;
  }
  // 'file' must be the actual Blob/File object
  // We include a filename 'audio.mp3' as the 3rd argument so the server knows the format
  if (audio) {
    formData.append('file', audio, 'audio.mp3');
  }
  if (file) {
    formData.append('file', file, file.name);
  }

  // Required: specify the model
  formData.append('model', 'gpt-4o-transcribe');

  try {
    const response = await fetch(AUDIO_TO_TEXT_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`
      },
      body: formData
    });

    const data = await response.json();
    console.log('Transcription:', data.text);
    return data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}
