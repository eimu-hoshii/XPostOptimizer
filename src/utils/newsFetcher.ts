/**
 * ニュース取得ユーティリティ
 * Yahoo! ニュース等の制限を回避しつつ、安定したジャンル別ニュースを取得する
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

/** 
 * ジャンルごとの検索クエリ (Google ニュース経由)
 * Yahoo! ニュースの直接RSSがプロキシで遮断されているため、Google ニュースの検索機能をプロキシとして利用
 */
const GENRE_QUERIES: Record<NewsGenre, string> = {
    top: '主要 ニュース',
    domestic: '日本 国内 ニュース',
    world: '国際 海外 ニュース',
    business: '経済 ビジネス ニュース',
    entertainment: 'エンタメ 芸能 ニュース',
    sports: 'スポーツ ニュース',
    it: 'IT テクノロジー',
    science: '科学 サイエンス',
    local: '地域 地方 ニュース',
};

/** すべてのジャンルを配列で取得 */
export const ALL_GENRES: NewsGenre[] = ['top', 'domestic', 'world', 'business', 'entertainment', 'sports', 'it', 'science', 'local'];

/**
 * RSS to JSON サービスを使用してニュースを取得する
 * (Google ニュース検索 RSS を使用することで高い安定性とCORS回避を実現)
 */
export const fetchNewsByGenre = async (genre: NewsGenre, count: number = 5): Promise<NewsItem[]> => {
    const query = encodeURIComponent(GENRE_QUERIES[genre]);
    // Google ニュース検索 RSS を使用 (rss2json サービス経由で取得)
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ja&gl=JP&ceid=JP:ja`;
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

        return data.items.slice(0, count).map((item: any) => {
            // タイトルからソース名を抽出 (例: "記事タイトル - 共同通信" -> 共同通信)
            const title = item.title;
            const sourceSeparatorIndex = title.lastIndexOf(' - ');
            const cleanTitle = sourceSeparatorIndex > 0 ? title.substring(0, sourceSeparatorIndex) : title;
            const source = sourceSeparatorIndex > 0 ? title.substring(sourceSeparatorIndex + 3) : 'ニュース';

            return {
                title: cleanTitle,
                link: item.link,
                source: source,
                pubDate: formatDate(item.pubDate),
            };
        });
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

    const newsMap: Record<NewsGenre, NewsItem[]> = {} as Record<NewsGenre, NewsItem[]>;
    ALL_GENRES.forEach(genre => {
        newsMap[genre] = [];
    });

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
