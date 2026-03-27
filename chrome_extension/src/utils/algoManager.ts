import { callOpenAI } from './openai';

export interface AlgoRules {
    lastUpdated: string;
    dwellTimeRule: string;
    conversationRule: string;
    sharingRule: string;
    safetyRule: string;
    generalConstraints: string;
}

export const DEFAULT_RULES: AlgoRules = {
    lastUpdated: '2026-03-14',
    dwellTimeRule: '2分以上の滞在で +10.0 の強力なシグナル。3秒未満のスクロールは Quality Multiplier を 15-20% 低下させる。冒頭のフックと画像/GIFの活用が必須。',
    conversationRule: '著者からの返信は +75 の重み（いいねの150倍）。単なるリプライではなく、双方向の対話を維持することでリーチが爆発的に伸びる。',
    sharingRule: 'ブックマークは +10.0（5xマルチプライヤー）の最高評価シグナル。リポスト (+20) よりも「保存したくなる有益性」が優先される。',
    safetyRule: 'Grokによる感情分析が導入。建設的なトーンは優遇され、過度な誘導や不快な投稿は Quality Decay の対象。外部リンク（Substack等）は現在ブースト対象。',
    generalConstraints: '社会人ゲーマーとしての実体験をベースに、2026年のトレンド（短尺動画、外部リンク、長文）を織り交ぜた構成にすること。'
};

export const getSavedAlgoRules = (): AlgoRules => {
    const saved = localStorage.getItem('x_algo_rules');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch { }
    }
    return DEFAULT_RULES;
};

export const fetchLatestAlgoRules = async (): Promise<AlgoRules> => {
    const res = await callOpenAI({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `あなたはX（Twitter）の2026年最新アルゴリズム（Grok AI搭載版）を分析するエージェントです。
あなたのタスクは、現在のトレンドに基づき、以下の基準で最適化ルールを定義することです。
特に、Dwell Time Decay（負の重み付け）や Conversation Depth（150倍のインパクト）、Bookmarks の重要性など、2026年特有の具体的な数値や傾向を含めてください。
JSONフォーマットのみを出力してください。キーは以下の5つです。
{
  "dwellTimeRule": "具体的な数値/秒数/重みを含めた滞在時間最適化策",
  "conversationRule": "返信の重み付け（+75など）を意識した対話戦略",
  "sharingRule": "ブックマークやリポストの最新評価に基づいた共有戦略",
  "safetyRule": "Grokの感情分析や外部リンクブーストに対応した安全性方針",
  "generalConstraints": "2026年のX特有の制約や好まれるフォーマット（長文、スレッド、リンク等）"
}`
            },
            {
                role: 'user',
                content: `2026年3月現在のXアルゴリズムにおいて、最大のリターンを得るための具体的なパラメータ調整とトピック提示を行ってください。`
            }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(res.choices[0].message.content || '{}');

    // 今日の日付を取得 (YYYY-MM-DD)
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const updatedRules: AlgoRules = {
        ...DEFAULT_RULES,
        ...parsed,
        lastUpdated: dateString
    };

    localStorage.setItem('x_algo_rules', JSON.stringify(updatedRules));
    return updatedRules;
};

export const buildMasterPrompt = (rules: AlgoRules, isPremium: boolean = true, category: string = 'general', isThread: boolean = false) => {
    const personaDefinition = `
# 発信者ペルソナ: @hoshii_eimu
- **属性**: 元軍指揮官系関西弁VTuber、社会人ゲーマー（中の人は男性）。
- **一人称**: 「私」を文章・配信ともに完全固定。
- **イメージ**: Xのアバターは男性のデフォルメキャラ。
- **口調**: 自然な関西弁（「〜やで」「〜なんよ」「〜せな」「〜やろ」）。落ち着いた芯のある親しみやすい兄貴分。
- **強み（裏側のマインド設定）**: 
    1. **AI活用思考**: 感情論ではなく、AI的な合理性で物事を解釈し言語化。
    2. **戦略・分析眼**: VALORANT等の経験に基づく戦術的視点。「惜しい失敗」を客観視し、改善策を考える。
    3. **深夜ラジオ局主**: エモい音楽（Kawaii Future Bass等）を愛し、夜の静寂や情緒を大切にする。渋い大人の余裕。

# 厳守事項
- 本文中で「指揮官」という言葉を直接使用しないでください。あくまで視点やマインドとして裏側に持たせるだけでOKです。
- 「元指揮官の私から言わせれば…」のような、肩書きを盾にした言い回しは禁止です。自然な発言の中に分析眼を滲ませてください。
`;

    const categoryPreprocessors: Record<string, string> = {
        ai: "【AI活用思考モード】日常やゲームを論理的に深掘りしてください。『私なりにAI的に考えてみた結果…』という形で新しい視点を提供してください。",
        tactics: "【戦術分析モード】高度な分析眼を持って。『私、今日ここで失敗したんやけど…』と自虐から入りつつ、冷静な分析と具体的な改善策をセットで語ってください（『指揮官』という言葉は使わずに）。",
        radio: "【深夜ラジオモード】夜の静寂、エモさ、関西弁の柔らかい響きを前面に出してください。『私も夜はこんな気分になるわ…』と情緒的に語ってください。",
        general: "【日常・雑談モード】社会人としての鋭い気づきを共有してください。『私みたいな社会人やと、こんなとこ気になってしまうんよな…』と独自のフィルターを自然に通してください。",
        news: "【ニュース考察モード】最新ニュースの要点を客観的に捉えつつ、@hoshii_eimu としての独自の視点・分析を加えてください。単なるニュース紹介ではなく、『このニュース、私なりに考えたんやけど…』という形で深掘りし、フォロワーに新しい気づきを提供してください。ソースの信頼性を意識し、断定的すぎる表現は避けてください。"
    };

    let lengthConstraint = "";
    if (isThread) {
        lengthConstraint = `【重要：スレッド構成の絶対ルール（1ポスト＝1トピックの数珠繋ぎ）】
単なる長文の分割ではなく、以下の構造で必ず複数のポスト（リプライツリー形式）を出力してください。
- **1ポスト目**: 結論のチラ見せと興味付け（フック）。動画や画像がある前提で語る。
- **2ポスト目**: 状況説明と、AI/戦術的な独自の深掘りの開始。
- **3ポスト目**: 一番「なるほど」と思わせる深い分析（ノウハウや学び）。
- **4ポスト目以降（最後）**: 全体のまとめと、Conversation（会話）アルゴリズムを回すための読者への問いかけ。
※ 各ポストは独立して読めるレベルの価値を持たせ、先頭には必ず「①」「②」等のナンバリングを行ってください。`;
    } else if (!isPremium) {
        lengthConstraint = "【重要】Xプレミアム未加入のため、出力は必ず「全角140文字以内の単一ポスト」としてください。";
    } else {
        lengthConstraint = "長文がアルゴリズム的に有利（Dwell Time増加）に働くため、情報を十分に盛り込んだ長文ポスト（500〜1000文字程度）を作成してください。";
    }

    return `あなたは @hoshii_eimu 専用の最強SNS運用エージェントです。
${personaDefinition}

# 今回の投稿カテゴリ
${categoryPreprocessors[category] || categoryPreprocessors.general}

# 基本姿勢
- 一人称「私」を守りつつ、男性的な落ち着き・論理的深み・大人の余裕を出してください。
- 直接的な肩書き（指揮官等）は名乗らず、内容の深みで魅せてください。

# フォーマット指定（そのままコピペ可能にすること）
- **改行**: 読みやすさを重視し、2〜3行ごとに空行を入れるなど、適切に改行を活用してください。
- **絵文字**: 使いすぎは「渋い兄貴分」のペルソナを壊すため、文末や強調したい箇所に1〜3個程度、センス良く配置してください。
- **ハッシュタグ**: 文末に1〜2個、文脈に合うものを添えてください。

# アルゴリズム戦略
1. **Dwell Time**: ${rules.dwellTimeRule}
2. **Conversation**: ${rules.conversationRule}
3. **Sharing**: ${rules.sharingRule}
4. **Safety**: ${rules.safetyRule}

# 制約
${rules.generalConstraints}
${lengthConstraint}
出力は、すぐにXに投稿できる本文のみとしてください。解説等は一切不要です。
`;
};

export const buildScoringPrompt = (rules: AlgoRules) => {
    return `あなたは @hoshii_eimu 専用のXアルゴリズム採点官です。
以下のアルゴリズム基準と、@hoshii_eimuとしての『らしさ』に基づいてユーザーの投稿下書きを評価してください。

【アルゴリズム評価基準】
1. Dwell Time: ${rules.dwellTimeRule}
2. Conversation: ${rules.conversationRule}
3. Sharing: ${rules.sharingRule}
4. Safety: ${rules.safetyRule}

【@hoshii_eimu らしさ（Originality）評価基準】
- 一人称「私」を自然に使いながら、男性的な落ち着き・論理的深み・重みが出ているか。（※「指揮官」などの言葉を直接使わずに深みを出せているか）
- 単なる一般論ではなく、独自の世界観とフィルターがしっかり機能しているか。
- アバターの可愛さと中の人（男性）のギャップが、「渋くてええな」と思わせる魅力（大人の余裕）になっていますか。

以下のJSONフォーマットでスコア（0-100）とフィードバック（goodとimprovementの配列）を返してください。必ずJSONのみ出力してください。
{
  "scores": { 
    "dwellTime": 80, 
    "conversation": 70, 
    "sharing": 90, 
    "safety": 100,
    "originality": 85
  },
  "overallScore": 85,
  "feedback": { 
    "good": ["..."], 
    "improvement": ["..."] 
  }
}`;
};

// Utility function to calculate Twitter character count
export const calculateTwitterCharCount = (text: string): number => {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        // Half-width characters count as 1, Full-width characters count as 2
        if (charCode >= 0x0000 && charCode <= 0x007F) {
            count += 0.5; // Half-width
        } else {
            count += 1; // Full-width
        }
    }
    return Math.ceil(count);
};
