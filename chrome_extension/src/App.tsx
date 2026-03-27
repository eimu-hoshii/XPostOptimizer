import { useState, useEffect } from 'react';
import { Settings, PenTool, BarChart3, Edit3, RefreshCw, Info } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlgoInfoModal } from './components/AlgoInfoModal';
import { PostGenerator } from './components/PostGenerator';
import { PostScorer } from './components/PostScorer';
import { initOpenAI } from './utils/openai';
import { getSavedAlgoRules, fetchLatestAlgoRules } from './utils/algoManager';
import type { AlgoRules } from './utils/algoManager';
import './App.css';

function App() {
  const [apiKey, setApiKey] = useState<string>(() => {
    const stored = localStorage.getItem('x_optimizer_api_key');
    if (stored) initOpenAI(stored);
    return stored || '';
  });
  const [showModal, setShowModal] = useState(false);
  const [showAlgoInfo, setShowAlgoInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'score'>('generate');
  const [rules, setRules] = useState<AlgoRules>(getSavedAlgoRules());
  const [isUpdatingRules, setIsUpdatingRules] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    const lastUpdated = new Date(rules.lastUpdated);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24));

    // 7日以上経過していたら自動更新
    if (diffDays >= 7) {
      handleForceUpdateRules();
    }
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    setShowModal(false);
  };

  const handleForceUpdateRules = async () => {
    if (!apiKey) return;
    setIsUpdatingRules(true);
    try {
      const newRules = await fetchLatestAlgoRules();
      setRules(newRules);
    } catch (error) {
      console.error('Failed to update rules:', error);
      alert('アルゴリズムの自動更新に失敗しました。');
    } finally {
      setIsUpdatingRules(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="header-brand">
          <Edit3 className="brand-icon" size={28} />
          <h1>X Post Optimizer for <span className="beta-badge">@hoshii_eimu</span></h1>
        </div>
        <button
          className="glass-button secondary settings-btn"
          onClick={() => setShowModal(true)}
        >
          <Settings size={20} />
          <span className="hidden-mobile">API設定</span>
        </button>
      </header>

      {apiKey && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <span>アルゴリズム情報: {rules.lastUpdated}</span>
          <button
            onClick={() => setShowAlgoInfo(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <Info size={14} /> 詳細を確認
          </button>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <button
            onClick={handleForceUpdateRules}
            disabled={isUpdatingRules}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={isUpdatingRules ? "animate-spin" : ""} />
            {isUpdatingRules ? "更新中..." : "最新化"}
          </button>
        </div>
      )}

      <main className="app-main animate-fade-in">
        <div className="tab-navigation glass-panel">
          <button
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <PenTool size={18} />
            ポスト生成
          </button>
          <button
            className={`tab-btn ${activeTab === 'score' ? 'active' : ''}`}
            onClick={() => setActiveTab('score')}
          >
            <BarChart3 size={18} />
            下書き採点
          </button>
        </div>

        <div className="tab-content">
          {!apiKey ? (
            <div className="api-key-warning glass-panel animate-fade-in">
              <h2>OpenAI APIキーが必要です</h2>
              <p>ポストの生成およびアルゴリズム採点を行うには、APIキーを設定してください。</p>
              <button className="glass-button" onClick={() => setShowModal(true)}>
                <Settings size={18} />APIキーを設定する
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: activeTab === 'generate' ? 'block' : 'none' }}>
                <PostGenerator rules={rules} />
              </div>
              <div style={{ display: activeTab === 'score' ? 'block' : 'none' }}>
                <PostScorer rules={rules} />
              </div>
            </>
          )}
        </div>
      </main>

      {showModal && (
        <ApiKeyModal onClose={() => setShowModal(false)} onSave={handleSaveApiKey} />
      )}
      {showAlgoInfo && (
        <AlgoInfoModal rules={rules} onClose={() => setShowAlgoInfo(false)} />
      )}
    </div>
  );
}

export default App;
