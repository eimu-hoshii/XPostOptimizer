import { useState } from 'react';
import { Loader2, Copy, Check, Brain, Target, Mic2, MessageSquare, Newspaper, Search, ExternalLink } from 'lucide-react';
import { callOpenAI } from '../utils/openai';
import { buildMasterPrompt, calculateTwitterCharCount } from '../utils/algoManager';
import type { AlgoRules } from '../utils/algoManager';
import { fetchAllGenreNews, GENRE_LABELS, ALL_GENRES } from '../utils/newsFetcher';
import type { NewsItem, NewsGenre } from '../utils/newsFetcher';

interface Props {
    rules: AlgoRules;
}

type Category = 'ai' | 'tactics' | 'radio' | 'general' | 'news';

export const PostGenerator = ({ rules }: Props) => {
    const [theme, setTheme] = useState('');
    const [context, setContext] = useState('');
    const [category, setCategory] = useState<Category>('general');
    const [isPremium, setIsPremium] = useState(false);
    const [isThread, setIsThread] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);

    // ニューススクリーニング用のstate
    const [newsMap, setNewsMap] = useState<Record<NewsGenre, NewsItem[]> | null>(null);
    const [activeGenre, setActiveGenre] = useState<NewsGenre>('top');
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState('');
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const masterPrompt = buildMasterPrompt(rules, isPremium, category, isThread);
            
            let prompt = '';
            if (theme.trim()) {
                prompt = `以下の条件でポストを作成してください。

【テーマ】: ${theme}
【追加の文脈・現在の状況】: ${context || '特になし'}
`;
            } else {
                prompt = `現在、具体的なテーマが指定されていません。
選択されたカテゴリ（${category}）に基づき、@hoshii_eimu として今日フォロワーに伝えたいこと、あるいは今考えていることを自由に考案してポストを作成してください。
社会人ゲーマーとしての日常、AIへの考察、深夜の独り言など、あなたらしいトピックを選んでください。
`;
            }

            const response = await callOpenAI({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: masterPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
            });

            setResult(response.choices[0].message.content || '');
        } catch (error: any) {
            console.error(error);
            setResult(`【エラーが発生しました】\nAPIキーが正しいか、通信がブロックされていないか確認してください。\n\n詳細: ${error.message || String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    /** ニューススクリーニングを実行 */
    const handleScreenNews = async () => {
        setNewsLoading(true);
        setNewsError('');
        setSelectedNews(null);
        try {
            const result = await fetchAllGenreNews(5);
            setNewsMap(result);
        } catch (error) {
            console.error(error);
            setNewsError('ニュースの取得に失敗しました。ネットワーク接続を確認してください。');
        } finally {
            setNewsLoading(false);
        }
    };

    /** ニュースを選択して入力欄に反映 */
    const handleSelectNews = (item: NewsItem) => {
        setSelectedNews(item);
        setTheme(`【${item.source}】${item.title}\n${item.link}`);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>@hoshii_eimu 専用ポスト生成</h2>
            
            <div className="form-group">
                <label>1. カテゴリを選択</label>
                <div className="category-selector" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button 
                        className={`glass-button secondary category-btn ${category === 'ai' ? 'active' : ''}`}
                        onClick={() => setCategory('ai')}
                        style={{ justifyContent: 'center', fontSize: '0.9rem', border: category === 'ai' ? '2px solid var(--accent-color)' : '' }}
                    >
                        <Brain size={18} /> AI思考
                    </button>
                    <button 
                        className={`glass-button secondary category-btn ${category === 'tactics' ? 'active' : ''}`}
                        onClick={() => setCategory('tactics')}
                        style={{ justifyContent: 'center', fontSize: '0.9rem', border: category === 'tactics' ? '2px solid var(--accent-color)' : '' }}
                    >
                        <Target size={18} /> 戦術分析
                    </button>
                    <button 
                        className={`glass-button secondary category-btn ${category === 'radio' ? 'active' : ''}`}
                        onClick={() => setCategory('radio')}
                        style={{ justifyContent: 'center', fontSize: '0.9rem', border: category === 'radio' ? '2px solid var(--accent-color)' : '' }}
                    >
                        <Mic2 size={18} /> 深夜ラジオ
                    </button>
                    <button 
                        className={`glass-button secondary category-btn ${category === 'general' ? 'active' : ''}`}
                        onClick={() => setCategory('general')}
                        style={{ justifyContent: 'center', fontSize: '0.9rem', border: category === 'general' ? '2px solid var(--accent-color)' : '' }}
                    >
                        <MessageSquare size={18} /> 日常・雑談
                    </button>
                    <button 
                        className={`glass-button secondary category-btn ${category === 'news' ? 'active' : ''}`}
                        onClick={() => setCategory('news')}
                        style={{ 
                            justifyContent: 'center', 
                            fontSize: '0.9rem', 
                            gridColumn: '1 / -1',
                            border: category === 'news' ? '2px solid #ff6b35' : '',
                            background: category === 'news' ? 'rgba(255, 107, 53, 0.15)' : '',
                        }}
                    >
                        <Newspaper size={18} /> 🔥 ニュース
                    </button>
                </div>
            </div>

            {/* ニューススクリーニング エリア */}
            {category === 'news' && (
                <div className="news-screening-area glass-panel animate-fade-in" style={{
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    borderRadius: '12px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>📰 ニューススクリーニング</h3>
                        <button 
                            className="glass-button" 
                            onClick={handleScreenNews}
                            disabled={newsLoading}
                            style={{ 
                                padding: '8px 16px', 
                                fontSize: '0.85rem',
                                background: 'linear-gradient(135deg, #ff6b35, #e74c3c)',
                            }}
                        >
                            {newsLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {newsLoading ? 'スクリーニング中...' : 'スクリーニング開始'}
                        </button>
                    </div>

                    {newsError && (
                        <div style={{ color: 'var(--error-color)', fontSize: '0.85rem', marginBottom: '8px' }}>
                            ⚠️ {newsError}
                        </div>
                    )}

                    {newsMap && (
                        <>
                            {/* ジャンルタブ */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {ALL_GENRES.map(genre => (
                                    <button 
                                        key={genre}
                                        onClick={() => setActiveGenre(genre)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '0.8rem',
                                            borderRadius: '20px',
                                            border: activeGenre === genre ? '2px solid #ff6b35' : '1px solid rgba(255,255,255,0.15)',
                                            background: activeGenre === genre ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255,255,255,0.05)',
                                            color: activeGenre === genre ? '#ff6b35' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {GENRE_LABELS[genre]}
                                    </button>
                                ))}
                            </div>

                            {/* ニュースリスト */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {newsMap[activeGenre].length === 0 ? (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>
                                        このジャンルのニュースが取得できませんでした
                                    </div>
                                ) : (
                                    newsMap[activeGenre].map((item, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => handleSelectNews(item)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: selectedNews?.link === item.link ? '2px solid #ff6b35' : '1px solid rgba(255,255,255,0.08)',
                                                background: selectedNews?.link === item.link ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255,255,255,0.03)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s ease',
                                                color: 'var(--text-primary)',
                                                width: '100%',
                                            }}
                                        >
                                            <span style={{ 
                                                flexShrink: 0,
                                                width: '22px', 
                                                height: '22px', 
                                                borderRadius: '50%', 
                                                background: selectedNews?.link === item.link ? '#ff6b35' : 'rgba(255,255,255,0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                color: selectedNews?.link === item.link ? '#fff' : 'var(--text-secondary)',
                                                marginTop: '2px',
                                            }}>
                                                {selectedNews?.link === item.link ? <Check size={12} /> : idx + 1}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '4px', fontWeight: 500 }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    <span>{item.source}</span>
                                                    <span>•</span>
                                                    <span>{item.pubDate}</span>
                                                </div>
                                            </div>
                                            <ExternalLink size={14} style={{ flexShrink: 0, color: 'var(--text-secondary)', marginTop: '4px' }} />
                                        </button>
                                    ))
                                )}
                            </div>

                            {selectedNews && (
                                <div style={{ 
                                    marginTop: '12px', 
                                    padding: '10px 12px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(255, 107, 53, 0.08)',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                }}>
                                    ✅ 「{selectedNews.title}」を選択しました。下の「内容・目的」に反映済みです。
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="form-group">
                <label>2. 内容・目的（空でもOK）</label>
                <textarea
                    className="glass-input"
                    placeholder="例：VALORANTで漁夫られた時の絶望感について（空欄ならAIが自動考案します）"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    rows={3}
                />
            </div>
            
            <div className="form-group">
                <label>3. 追加の文脈・今の状況（任意）</label>
                <textarea
                    className="glass-input"
                    placeholder="例：今日は定食を2つも食べてしまった。お腹いっぱいすぎる。"
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    rows={2}
                />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                    type="checkbox"
                    id="premium-check"
                    checked={isPremium}
                    onChange={e => setIsPremium(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                />
                <label htmlFor="premium-check" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', color: isPremium ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                    Xプレミアム加入済（長文ポスト生成）
                </label>
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <input
                    type="checkbox"
                    id="thread-check"
                    checked={isThread}
                    onChange={e => setIsThread(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                />
                <label htmlFor="thread-check" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', color: isThread ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                    スレッドポスト生成（1ポスト1トピック構成）
                </label>
            </div>

            <button
                className="glass-button"
                style={{ width: '100%', height: '50px', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--accent-color), #8a2be2)' }}
                onClick={handleGenerate}
                disabled={loading}
            >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <SparklesIcon size={24} />}
                {theme.trim() ? '生成する' : 'お任せで生成する'}
            </button>

            {result && (
                <div className="result-panel glass-panel animate-fade-in" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>✨ 最適化されたポスト案</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                fontSize: '0.85rem',
                                color: (!isPremium && calculateTwitterCharCount(result) > 140) ? 'var(--error-color)' : 'var(--text-secondary)'
                            }}>
                                文字数: {calculateTwitterCharCount(result)} / {isPremium ? '10000' : '140'}
                            </span>
                            <button className="glass-button secondary" onClick={copyToClipboard} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'コピー' : 'コピー'}
                            </button>
                        </div>
                    </div>

                    <div className="generated-post" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem' }}>{result}</div>
                </div>
            )}
        </div>
    );
};

const SparklesIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
);
