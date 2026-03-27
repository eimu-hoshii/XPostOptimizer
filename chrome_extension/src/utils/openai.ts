let currentApiKey = '';

export const initOpenAI = (apiKey: string) => {
  currentApiKey = apiKey;
};

export const getApiKey = () => currentApiKey;

export const callOpenAI = async (payload: any): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("APIキーが設定されていません");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒タイムアウト

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
        const errText = await res.text();
        let parsedErr = errText;
        try { 
            const json = JSON.parse(errText);
            if (json.error && json.error.message) parsedErr = json.error.message;
        } catch(e) {}
        throw new Error(`APIエラー (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("通信がタイムアウトしました。ネットワークを確認してください。");
    }
    throw error;
  }
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
