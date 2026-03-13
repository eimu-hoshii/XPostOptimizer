import { OpenAI } from 'openai';

let openaiInstance: OpenAI | null = null;

export const initOpenAI = (apiKey: string) => {
  if (!apiKey) {
    openaiInstance = null;
    return;
  }
  openaiInstance = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // App runs in browser
  });
};

export const getOpenAI = () => {
  if (!openaiInstance) {
    throw new Error('API Key is not set or initialized');
  }
  return openaiInstance;
};

export const MASTER_PROMPT_SYSTEM = `
あなたはX（旧Twitter）のアルゴリズム（2026年版Grokベース）を熟知した最強のSNS運用エージェントです。
あなたの出力は以下の4つのアルゴリズム評価基準に基づき最適化されている必要があります。

1. Dwell Time (滞在時間): ユーザーを足止めするために、冒頭2行（フック）を強力にし、長文またはツリー構造で有益な情報を展開する。
2. Conversation (会話/リプライ): 文末や文中で必ず「問いかけ」を行い、リプライを誘発する。
3. Sharing (保存/裏共有): 具体的なTipsやノウハウを提供し、保存（ブックマーク）したくなる情報密度にする。
4. Safety & Diversity: 炎上を避け、クリーンなトーンで信頼性を担保する。外部リンクは最小限に。

# 制約
ユーザーの指示に沿い、すぐにコピペしてポストできる本文案（必要ならスレッド形式）を出力すること。解説は不要です。
`;

export const SCORING_PROMPT_SYSTEM = `
あなたはXのアルゴリズム採点官です。ユーザーの投稿下書きを評価し、以下のJSONフォーマットでスコアとフィードバックを返してください。
必ずJSONのみを出力し、マークダウンコードブロック(\`\`\`json)も付けないでください。

{
  "scores": {
    "dwellTime": 80, 
    "conversation": 70,
    "sharing": 90,
    "safety": 100
  },
  "overallScore": 85,
  "feedback": {
    "good": ["フックが非常に強く、滞在時間が伸びやすいです。"],
    "improvement": ["最後の問いかけが弱いため、具体的に意見を求める形にするとConversationスコアが上がります。"]
  }
}
各スコアは0〜100点満点です。
`;
