/**
 * ニュース取得ユーティリティ
 * 環境（開発・拡張機能・本番）に応じて最適な経路で Yahoo! ニュース RSS を取得する
 */

/** ニュース記事の型定義 */
export interface NewsItem {
    title: string;
    link: string;
    source: string;
    pubDate: string;
}

/** ニュースジャンルの型定義 */
export type NewsGenre = 'top' | 'domestic' | 'world' | 'business' | 'entertainment' | 'sports' | 'it' | 'science' | 'local';

/** ジャンル表示名のマッピング */
export const GENRE_LABELS: Record<NewsGenre, string> = {
    top: '📍 主要',
    domestic: '🇯🇵 国内',
    world: '🌎 国際',
    business: '📈 経済',
    entertainment: '🎬 エンタメ',
    sports: '⚽ スポーツ',
    it: '💻 IT',
    science: '🧪 科学',
    local: '🏘️ 地域',
};

/** ジャンルごとのRSSフィードの相対パス (Yahoo!ニュース トピックス) */
const GENRE_RSS_PATHS: Record<NewsGenre, string> = {
    top: 'topics/top-picks.xml',
    domestic: 'topics/domestic.xml',
    world: 'topics/world.xml',
    business: 'topics/business.xml',
    entertainment: 'topics/entertainment.xml',
    sports: 'topics/sports.xml',
    it: 'topics/it.xml',
    science: 'topics/science.xml',
    local: 'topics/local.xml',
};

/** すべてのジャンルを配列で取得 */
export const ALL_GENRES: NewsGenre[] = ['top', 'domestic', 'world', 'business', 'entertainment', 'sports', 'it', 'science', 'local'];

/**
 * 環境に応じた最適な RSS URL を構築する
 */
const getProxyUrl = (path: string): string => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    const fullUrl = `https://news.yahoo.co.jp/rss/${path}`;

    if (isLocalhost) {
        // Vite のプロキシ設定 (/yahoo-rss) を使用して CORS を回避
        return `/yahoo-rss/${path}`;
    } else if (isExtension) {
        // Chrome 拡張機能環境では host_permissions により直接取得可能
        return fullUrl;
    } else {
        // GitHub Pages 等の本番環境では、公共プロキシを介して取得
        // (Yahoo! の海外ブロックを回避するため JSON エンコード形式を使用)
        return `https://api.allorigins.win/get?url=${encodeURIComponent(fullUrl)}`;
    }
};

/**
 * Yahoo! ニュース RSS を取得する
 */
export const fetchNewsByGenre = async (genre: NewsGenre, count: number = 5): Promise<NewsItem[]> => {
    const path = GENRE_RSS_PATHS[genre];
    const url = getProxyUrl(path);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`ニュース取得失敗: ${response.status}`);
        }

        let xmlText = '';
        if (url.includes('allorigins.win')) {
            // 公共プロキシ経由の場合は JSON 内の contents を取得
            const data = await response.json();
            xmlText = data.contents;
        } else {
            // 直接取得または Vite プロキシの場合はテキストとして取得
            xmlText = await response.text();
        }
        
        if (!xmlText) {
            throw new Error('RSSの内容が空です');
        }

        return parseRssXml(xmlText, count);
    } catch (error) {
        console.error(`ニュース取得エラー (${genre}):`, error);
        return [];
    }
};

/**
 * RSS XMLをパースしてニュース記事を抽出する
 */
const parseRssXml = (xmlText: string, count: number): NewsItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    // パースエラーのチェック
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        console.error('XMLパースエラー:', parserError.textContent);
        return [];
    }

    const items = doc.querySelectorAll('item');
    const newsItems: NewsItem[] = [];

    for (let i = 0; i < Math.min(items.length, count); i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        newsItems.push({
            title,
            link,
            source: 'Yahoo!ニュース',
            pubDate: formatDate(pubDate),
        });
    }

    return newsItems;
};

/**
 * 全ジャンルのニュースを並行取得する
 */
export const fetchAllGenreNews = async (count: number = 5): Promise<Record<NewsGenre, NewsItem[]>> => {
    const results = await Promise.allSettled(
        ALL_GENRES.map(async (genre) => ({
            genre,
            items: await fetchNewsByGenre(genre, count),
        }))
    );

    const newsMap: Record<NewsGenre, NewsItem[]> = {} as Record<NewsGenre, NewsItem[]>;
    ALL_GENRES.forEach(genre => { newsMap[genre] = []; });

    for (const result of results) {
        if (result.status === 'fulfilled') {
            newsMap[result.value.genre] = result.value.items;
        }
    }

    return newsMap;
};

/**
 * 日付文字列を日本語フォーマットに変換する
 */
const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
        return dateStr;
    }
};
