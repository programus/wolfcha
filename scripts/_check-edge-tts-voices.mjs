import { listVoices } from 'edge-tts-universal';

const voices = await listVoices();

const zhVoices = voices.filter(v => v.Locale.startsWith('zh-CN') || v.Locale.startsWith('zh-TW'));
const enVoices = voices.filter(v => ['en-US','en-GB','en-AU'].some(l => v.Locale.startsWith(l)));

console.log('=== ZH-CN / ZH-TW voices ===');
zhVoices.forEach(v => console.log(v.ShortName, v.Gender, v.Locale, JSON.stringify(v.VoiceTag?.VoicePersonalities)));

console.log('\n=== EN-US / EN-GB / EN-AU voices ===');
enVoices.forEach(v => console.log(v.ShortName, v.Gender, v.Locale, JSON.stringify(v.VoiceTag?.VoicePersonalities)));

// Check our current IDs
const currentIds = [
  'zh-CN-YunxiNeural','zh-CN-YunjianNeural','zh-CN-YunhaoNeural','zh-CN-YunyangNeural',
  'zh-CN-YunzeNeural','zh-CN-XiaoshuangNeural','zh-CN-XiaoxiaoNeural','zh-CN-XiaomoNeural',
  'zh-CN-XiaohanNeural','zh-CN-XiaoqiuNeural','zh-CN-XiaoruiNeural',
  'en-US-ChristopherNeural','en-US-GuyNeural','en-AU-WilliamNeural',
  'en-GB-SoniaNeural','en-US-AriaNeural','en-US-JennyNeural',
];
const allShortNames = new Set(voices.map(v => v.ShortName));
console.log('\n=== Checking current voice IDs ===');
for (const id of currentIds) {
  console.log(id, allShortNames.has(id) ? 'OK' : '*** NOT FOUND ***');
}
