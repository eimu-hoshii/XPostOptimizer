/**
 * ニュース取得ユーティリティ
 * 専門サイトのRSSを RSS to JSON サービス経由で取得する
 */

/** ニュース記事の型定義 */
export interface NewsItem {
    title: string;
    link: string;
    source: string;
    pubDate: string;
}

/** ニュースジャンルの型定義 */
export type NewsGenre = 'ai' | 'game' | 'society';

/** ジャンル表示名のマッピング */
export const GENRE_LABELS: Record<NewsGenre, string> = {
    ai: '🤖 AI・テクノロジー',
    game: '🎮 ゲーム',
    society: '🌍 IT・社会',
};

/** ジャンルごとのRSSフィードURL */
const GENRE_RSS_URLS: Record<NewsGenre, string> = {
    ai: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',       // ITmedia AI+
    game: 'https://www.4gamer.net/rss/index.xml',            // 4Gamer.net
    society: 'https://gigazine.net/news/rss_2.0/'            // GIGAZINE
};

/** すべてのジャンルを配列で取得 */
export const ALL_GENRES: NewsGenre[] = ['ai', 'game', 'society'];

/**
 * RSS to JSON サービスを使用してニュースを取得する
 * @param genre - 取得するジャンル
 * @param count - 取得件数
 * @returns ニュース記事の配列
 */
export const fetchNewsByGenre = async (genre: NewsGenre, count: number = 5): Promise<NewsItem[]> => {
    const rssUrl = GENRE_RSS_URLS[genre];
    // RSS to JSON API を使用 (CORS回避とパース処理の簡略化)
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`ニュース取得失敗: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 'ok') {
            throw new Error(`APIエラー: ${data.message}`);
        }

        return data.items.slice(0, count).map((item: any) => ({
            title: item.title,
            link: item.link,
            source: data.feed.title.split(' ')[0] || 'ニュース', // サイト名を抽出
            pubDate: formatDate(item.pubDate),
        }));
    } catch (error) {
        console.error(`ニュース取得エラー (${genre}):`, error);
        return [];
    }
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

    const newsMap: Record<NewsGenre, NewsItem[]> = {
        ai: [],
        game: [],
        society: [],
    };

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
