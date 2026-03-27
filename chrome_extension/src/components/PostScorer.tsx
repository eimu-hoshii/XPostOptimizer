import { useState } from 'react';
import { Target, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { callOpenAI } from '../utils/openai';
import { buildScoringPrompt, buildMasterPrompt, calculateTwitterCharCount } from '../utils/algoManager';
import type { AlgoRules } from '../utils/algoManager';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

interface ScoringResult {
    scores: {
        dwellTime: number;
        conversation: number;
        sharing: number;
        safety: number;
        originality: number;
    };
    overallScore: number;
    feedback: {
        good: string[];
        improvement: string[];
    };
}

interface Props {
    rules: AlgoRules;
}

export const PostScorer = ({ rules }: Props) => {
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScoringResult | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const [regeneratedText, setRegeneratedText] = useState('');
    const [copied, setCopied] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    const handleScore = async () => {
        if (!draft) return;
        setLoading(true);
        setResult(null);

        try {
            const scoringPrompt = buildScoringPrompt(rules);
            const response = await callOpenAI({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: scoringPrompt },
                    { role: 'user', content: `以下のポスト案を評価してください。\n\n${draft}` }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            if (content) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : content;
                try {
                    setResult(JSON.parse(jsonString) as ScoringResult);
                } catch (parseError) {
                    console.error('Failed to parse JSON:', content, parseError);
                    alert('AIの返答形式が不正でした。もう一度採点をお試しください。');
                }
            }
        } catch (error: any) {
            console.error(error);
            alert(`評価中にエラーが発生しました。\n詳細: ${error.message || String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (!draft || !result) return;
        setRegenerating(true);
        setRegeneratedText('');

        try {
            const masterPrompt = buildMasterPrompt(rules, isPremium, 'general');
            const prompt = `以下の「元の下書き」と「改善点フィードバック」を元に、@hoshii_eimu として完璧なポストに書き直してください。

【重要：徹底厳守】
- 元の下書きの「関西弁のニュアンス」「指揮官としての視点」「AI的思考」といったキャラクター性を120%引き出し、強化してください。
- アルゴリズム最適化（滞在時間稼ぎ、リプライ誘発）を施しながらも、不自然な営業感が出ないようにしてください。

【元の下書き】:
${draft}

【AIからの改善アドバイス】:
${result.feedback.improvement.join('\n')}
`;

            const response = await callOpenAI({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: masterPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            });

            setRegeneratedText(response.choices[0].message.content || '');
        } catch (error) {
            console.error(error);
            alert('再生成に失敗しました。');
        } finally {
            setRegenerating(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(regeneratedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const chartData = result ? {
        labels: ['Dwell Time', 'Conversation', 'Sharing', 'Safety', 'Originality (らしさ)'],
        datasets: [
            {
                label: 'スコア',
                data: [
                    result.scores.dwellTime,
                    result.scores.conversation,
                    result.scores.sharing,
                    result.scores.safety,
                    result.scores.originality
                ],
                backgroundColor: 'rgba(138, 43, 226, 0.4)',
                borderColor: 'rgba(138, 43, 226, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(138, 43, 226, 1)',
            },
        ],
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                pointLabels: { color: '#c9d1d9', font: { size: 11 } },
                ticks: { display: false, stepSize: 20, min: 0, max: 100 }
            }
        },
        plugins: {
            legend: { display: false }
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>@hoshii_eimu ポスト採点</h2>
            <div className="form-group">
                <label>ポストの下書き</label>
                <textarea
                    className="glass-input"
                    placeholder="採点したいポスト本文をここに入力してください..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={5}
                />
            </div>
            <button
                className="glass-button"
                style={{ width: '100%', height: '50px', fontSize: '1.1rem' }}
                onClick={handleScore}
                disabled={loading || !draft.trim()}
            >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Target size={24} />}
                アルゴリズム＆「らしさ」を採点
            </button>

            {result && (
                <div className="dashboard-grid animate-fade-in" style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    <div className="chart-container glass-panel" style={{ padding: '20px' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>総合診断</h3>
                        <div className="score-card" style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div className="score-number" style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{result.overallScore}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>/ 100 pt</div>
                        </div>
                        {chartData && (
                            <div style={{ position: 'relative', width: '100%', height: '280px' }}>
                                <Radar data={chartData} options={chartOptions} />
                            </div>
                        )}
                    </div>
                    
                    <div className="feedback-container">
                        <div className="feedback-list glass-panel" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid #10b981' }}>
                            <h4 style={{ color: '#10b981', marginTop: 0 }}><Sparkles size={16} /> 良い点（加点要因）</h4>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {result.feedback.good.map((item, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>)}
                            </ul>
                        </div>

                        <div className="feedback-list glass-panel" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid #ef4444' }}>
                            <h4 style={{ color: '#ef4444', marginTop: 0 }}>🔧 改善点（伸び悩みの要因）</h4>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {result.feedback.improvement.map((item, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>)}
                            </ul>
                        </div>

                        <div className="action-area" style={{ marginTop: '24px' }}>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="checkbox"
                                    id="scorer-premium-check"
                                    checked={isPremium}
                                    onChange={e => setIsPremium(e.target.checked)}
                                />
                                <label htmlFor="scorer-premium-check" style={{ fontSize: '0.9rem' }}>Xプレミアム加入済として再構成</label>
                            </div>
                            <button
                                className="glass-button"
                                style={{ width: '100%', height: '50px', background: 'linear-gradient(135deg, var(--accent-color), #8a2be2)' }}
                                onClick={handleRegenerate}
                                disabled={regenerating}
                            >
                                {regenerating ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                                完璧に「最適化」して書き直す
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {regeneratedText && (
                <div className="result-panel glass-panel animate-fade-in" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>✨ 究極の最適化ポスト案</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                文字数: {calculateTwitterCharCount(regeneratedText)}
                            </span>
                            <button className="glass-button secondary" onClick={copyToClipboard} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'コピー' : 'コピー'}
                            </button>
                        </div>
                    </div>

                    <div className="generated-post" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem' }}>{regeneratedText}</div>
                </div>
            )}
        </div>
    );
};
