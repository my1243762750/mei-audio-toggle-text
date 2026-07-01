export const speakers = [
  { value: "Serena", label: "Serena - 中文温柔年轻女声" },
  { value: "Vivian", label: "Vivian - 中文明亮年轻女声" },
  { value: "Uncle_Fu", label: "Uncle_Fu - 中文低沉成熟男声" },
  { value: "Dylan", label: "Dylan - 北京男声" },
  { value: "Eric", label: "Eric - 成都男声" },
  { value: "Ryan", label: "Ryan - 英文节奏感男声" },
  { value: "Aiden", label: "Aiden - 美式清亮男声" },
  { value: "Ono_Anna", label: "Ono_Anna - 日文活泼女声" },
  { value: "Sohee", label: "Sohee - 韩文温暖女声" },
];

export const languages = [
  "Auto",
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Russian",
  "Portuguese",
  "Spanish",
  "Italian",
];

export const instructExamples = [
  "用特别愤怒的语气说",
  "Very happy.",
  "请特别小声的悄悄说",
  "Speaking at an extremely slow pace",
  "音调低沉",
  "冷静分析，语速稳定",
  "以兴奋和热情的方式说话",
  "用悲伤且带着哭腔的语气说",
  "带着轻松的笑意说话",
  "冷酷、充满敌意的语气",
  "声音洪亮，带有庄严的仪式感",
  "模仿极其焦急、语速飞快的状态",
];

export const voiceDesignExamples = [
  "年轻女性声音，音调偏高，语气温柔，表达自然亲切",
  "成熟男性声音，低沉稳重，像纪录片旁白",
  "活泼少女声音，语速稍快，情绪开心，有明显起伏",
  "新闻播报风格，吐字清晰，语气正式，节奏稳定",
  "温柔甜美的年轻女声，普通话标准，语调轻柔，适合故事朗读",
  "富有磁性的成熟男声，音色深沉浑厚，语速沉稳，适合纪录片解说",
  "活泼开朗的小男孩声音，稚嫩清脆，语调欢快，充满好奇心",
  "苍老慈祥的老爷爷声音，略带沙哑和气声，语速缓慢，非常有故事感",
  "干练自信的职场女性声音，吐字清晰，语气坚定，适合商业演示配音",
];

export const modes = [
  {
    value: "custom_voice",
    title: "经典音色",
    description: "9 个固定音色 + 风格指令控制",
  },
  {
    value: "voice_design",
    title: "音色设计",
    description: "用文字描述创造音色",
  },
  {
    value: "base_clone",
    title: "声音克隆",
    description: "上传参考音频做声音克隆",
  },
];

export const nativeSpeakerByLanguage: Record<string, string> = {
  Chinese: "Serena",
  English: "Ryan",
  Japanese: "Ono_Anna",
  Korean: "Sohee",
};

export const sampleTextByLanguage: Record<string, string> = {
  Chinese: "你好，这是中文语音测试。",
  English: "Hello, this is an English text to speech test.",
  Japanese: "こんにちは、これは日本語の音声テストです。",
  Korean: "안녕하세요, 이것은 한국어 음성 테스트입니다.",
};
