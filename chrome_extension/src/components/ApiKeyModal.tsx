import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { initOpenAI } from '../utils/openai';

interface ApiKeyModalProps {
    onClose: () => void;
    onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave }) => {
    const [key, setKey] = useState('');

    const handleSave = () => {
        if (key.trim()) {
            localStorage.setItem('x_optimizer_api_key', key.trim());
            initOpenAI(key.trim());
            onSave(key.trim());
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel animate-fade-in">
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="modal-header">
                    <KeyRound className="modal-icon" size={24} />
                    <h2>APIキー設定</h2>
                </div>
                <p className="modal-description">
                    OpenAIのAPIキー（sk-...）を入力してください。キーはお使いのブラウザ（ローカル）にのみ保存されます。
                </p>
                <div className="modal-body">
                    <input
                        type="password"
                        className="glass-input"
                        placeholder="sk-..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                </div>
                <div className="modal-footer">
                    <button className="glass-button secondary" onClick={onClose}>キャンセル</button>
                    <button className="glass-button" onClick={handleSave} disabled={!key.trim()}>保存して閉じる</button>
                </div>
            </div>
        </div>
    );
};
