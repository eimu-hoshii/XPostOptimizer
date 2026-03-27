/**
 * ニュース取得ユーティリティ
 * Yahoo! ニュース RSS を直接取得・パースする (alloriginsプロキシを使用)
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

/** ジャンルごとのRSSフィードURL (Yahoo!ニュース トピックス) */
const GENRE_RSS_URLS: Record<NewsGenre, string> = {
    top: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
    domestic: 'https://news.yahoo.co.jp/rss/topics/domestic.xml',
    world: 'https://news.yahoo.co.jp/rss/topics/world.xml',
    business: 'https://news.yahoo.co.jp/rss/topics/business.xml',
    entertainment: 'https://news.yahoo.co.jp/rss/topics/entertainment.xml',
    sports: 'https://news.yahoo.co.jp/rss/topics/sports.xml',
    it: 'https://news.yahoo.co.jp/rss/topics/it.xml',
    science: 'https://news.yahoo.co.jp/rss/topics/science.xml',
    local: 'https://news.yahoo.co.jp/rss/topics/local.xml',
};

/** すべてのジャンルを配列で取得 */
export const ALL_GENRES: NewsGenre[] = ['top', 'domestic', 'world', 'business', 'entertainment', 'sports', 'it', 'science', 'local'];

/**
 * Yahoo! ニュース RSS を取得する
 */
export const fetchNewsByGenre = async (genre: NewsGenre, count: number = 5): Promise<NewsItem[]> => {
    const rssUrl = GENRE_RSS_URLS[genre];
    // allorigins プロキシを使用して CORS と地理的制限を回避
    // (Yahoo! ニュースの海外ブロックを回避するため JSON エンコード形式で取得)
    const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`ニュース取得失敗: ${response.status}`);
        }

        const data = await response.json();
        const xmlText = data.contents;
        
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
    const items = doc.querySelectorAll('item');
    const newsItems: NewsItem[] = [];

    for (let i = 0; i < Math.min(items.length, count); i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';

        // Yahoo! ニュース RSS はタイトルにサイト名が含まれないことが多いためソース名を固定または推測
        // 必要に応じて title の形式をチェック
        const source = 'Yahoo!ニュース';

        newsItems.push({
            title,
            link,
            source,
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
