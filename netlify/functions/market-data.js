const axios = require('axios');

const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const WORLD_NEWS_API_KEY = process.env.WORLD_NEWS_API_KEY; // New key

const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// 1. News Headlines - Reworked to use multiple sources
async function fetchNewsHeadlines() {
    // We will call both APIs and combine the results for reliability.
    const worldNewsPromise = axios.get(`https://api.worldnewsapi.com/top-news?source-country=us&language=en`, {
        headers: { 'x-api-key': WORLD_NEWS_API_KEY }
    });
    const newsApiPromise = axios.get(`https://newsapi.org/v2/top-headlines?category=business&apiKey=${NEWS_API_KEY}`);

    // Promise.allSettled ensures that even if one API fails, the other can still succeed.
    const results = await Promise.allSettled([worldNewsPromise, newsApiPromise]);

    let headlines = [];

    // Process World News API results (if successful)
    if (results[0].status === 'fulfilled' && results[0].value.data.top_news) {
        const worldNews = results[0].value.data.top_news
            .slice(0, 5) // Take top 5 clusters
            .map(cluster => `- ${cluster.news[0].title}`); // Take the first article from each cluster
        headlines.push(...worldNews);
    } else {
        console.error("World News API failed:", results[0].reason?.response?.data || "Unknown Error");
    }

    // Process NewsAPI results (if successful)
    if (results[1].status === 'fulfilled' && results[1].value.data.articles) {
        const newsApiArticles = results[1].value.data.articles
            .slice(0, 5)
            .map(article => `- ${article.title}`);
        headlines.push(...newsApiArticles);
    } else {
        console.error("NewsAPI failed:", results[1].reason?.response?.data || "Unknown Error");
    }

    if (headlines.length === 0) {
        return ["- Could not fetch headlines from any source."];
    }
    
    // Remove duplicate headlines and return the top 7 unique results
    const uniqueHeadlines = [...new Set(headlines)];
    return uniqueHeadlines.slice(0, 7);
}


// 2. Market Data (This function is correct and remains the same)
async function fetchMarketData() {
    try {
        const tickers = "^GSPC,^DJI,NDAQ,^FTSE,^VIX,EURUSD,GBPUSD,USDJPY,AUDUSD,USDCHF,BTCUSD,ETHUSD,GCUSD,CLUSD";
        const url = `https://financialmodelingprep.com/stable/quote/${tickers}?apikey=${FMP_API_KEY}`;
        const { data } = await axios.get(url);
        
        if (!data || data.length === 0) throw new Error("API returned an empty array for market data.");
        
        const dataMap = data.reduce((map, item) => (map[item.symbol] = item, map), {});
        
        const get = (symbol, field, toLocale = false) => {
            if (dataMap[symbol] && dataMap[symbol][field] !== undefined) {
                const value = dataMap[symbol][field];
                return typeof value === 'number' && toLocale ? value.toLocaleString() : value;
            }
            return 'N/A';
        };

        const output = [];
        output.push("*Indices*");
        output.push(`- S&P 500: ${formatPct(get('^GSPC', 'changePercentage'))}, Last: ${get('^GSPC', 'price', true)}`);
        output.push(`- Dow Jones: ${formatPct(get('^DJI', 'changePercentage'))}, Last: ${get('^DJI', 'price', true)}`);
        output.push(`- Nasdaq (NDAQ): ${formatPct(get('NDAQ', 'changePercentage'))}, Last: ${get('NDAQ', 'price', true)}`);
        output.push(`- FTSE 100: ${formatPct(get('^FTSE', 'changePercentage'))}, Last: ${get('^FTSE', 'price', true)}`);
        output.push(`- VIX: ${formatPct(get('^VIX', 'changePercentage'))}, Last: ${get('^VIX', 'price').toFixed(2)}`);
        output.push("");

        output.push("*Currencies*");
        output.push(`- EUR/USD: ${formatPct(get('EURUSD', 'changePercentage'))}, Last: ${get('EURUSD', 'price').toFixed(4)}`);
        output.push(`- GBP/USD: ${formatPct(get('GBPUSD', 'changePercentage'))}, Last: ${get('GBPUSD', 'price').toFixed(4)}`);
        output.push(`- USD/JPY: ${formatPct(get('USDJPY', 'changePercentage'))}, Last: ${get('USDJPY', 'price').toFixed(2)}`);
        output.push(`- AUD/USD: ${formatPct(get('AUDUSD', 'changePercentage'))}, Last: ${get('AUDUSD', 'price').toFixed(4)}`);
        output.push(`- USD/CHF: ${formatPct(get('USDCHF', 'changePercentage'))}, Last: ${get('USDCHF', 'price').toFixed(4)}`);
        output.push("");
        
        output.push("*Crypto & Commodities*");
        output.push(`- Bitcoin: ${formatPct(get('BTCUSD', 'changePercentage'))}, Last: ${get('BTCUSD', 'price', true)}`);
        output.push(`- Ethereum: ${formatPct(get('ETHUSD', 'changePercentage'))}, Last: ${get('ETHUSD', 'price', true)}`);
        output.push(`- Gold (GCUSD): ${formatPct(get('GCUSD', 'changePercentage'))}, Last: ${get('GCUSD', 'price', true)}`);
        output.push(`- WTI Oil (CLUSD): ${formatPct(get('CLUSD', 'changePercentage'))}, Last: ${get('CLUSD', 'price', true)}`);

        return output;
    } catch (error) {
         console.error("Error fetching Market Data:", error.message);
         return ["Error fetching market data. Please check API key and ticker symbols."];
    }
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    try {
        const [newsHeadlines, marketData] = await Promise.all([
            fetchNewsHeadlines(),
            fetchMarketData(),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({ newsHeadlines, marketData })
        };
    } catch (error) {
        console.error("Fatal error in serverless function handler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch all data" })
        };
    }
};
