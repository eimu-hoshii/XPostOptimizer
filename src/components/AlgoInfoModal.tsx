import React from 'react';
import { Info, X } from 'lucide-react';
import type { AlgoRules } from '../utils/algoManager';

interface AlgoInfoModalProps {
    rules: AlgoRules;
    onClose: () => void;
}

export const AlgoInfoModal: React.FC<AlgoInfoModalProps> = ({ rules, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="modal-header">
                    <Info className="modal-icon" size={24} />
                    <h2>現在のXアルゴリズムルール</h2>
                </div>
                <p className="modal-description" style={{ marginBottom: '16px' }}>
                    適用中の採点基準と最適化ルール（最終更新: {rules.lastUpdated}）
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="algo-rule-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--accent-color)' }}>⏱️ Dwell Time (滞在時間)</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{rules.dwellTimeRule}</p>
                    </div>

                    <div className="algo-rule-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--accent-color)' }}>💬 Conversation (会話/リプライ)</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{rules.conversationRule}</p>
                    </div>

                    <div className="algo-rule-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--accent-color)' }}>🔄 Sharing (保存/シェア)</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{rules.sharingRule}</p>
                    </div>

                    <div className="algo-rule-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--success-color)' }}>🛡️ Safety & Diversity (安全性)</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{rules.safetyRule}</p>
                    </div>

                    <div className="algo-rule-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--text-secondary)' }}>
                        <h4 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>📌 一般的な制約事項</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{rules.generalConstraints}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
