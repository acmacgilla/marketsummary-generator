const axios = require('axios');

const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// 1. News Headlines with 4-hour filter
async function fetchNewsHeadlines() {
    try {
        const url = `https://newsapi.org/v2/top-headlines?category=business&apiKey=${NEWS_API_KEY}`;
        const { data } = await axios.get(url);
        
        // Filter for articles in the last 4 hours
        const fourHoursAgo = new Date(Date.now() - (4 * 60 * 60 * 1000));
        const recentArticles = data.articles.filter(article => new Date(article.publishedAt) > fourHoursAgo);

        if (recentArticles.length === 0) return ["- No major business headlines in the last 4 hours."];
        return recentArticles.slice(0, 5).map(article => `- ${article.title}`);

    } catch (error) {
        console.error("Error fetching News API:", error.response ? error.response.data : error.message);
        return ["Error fetching news headlines."];
    }
}

// 2. Market Data with robust error handling
async function fetchMarketData() {
    try {
        const tickers = "^GSPC,^DJI,NDAQ,^FTSE,^VIX,EURUSD,GBPUSD,USDJPY,AUDUSD,USDCHF,BTCUSD,ETHUSD,GCUSD,CLUSD"; // Using NDAQ and CLUSD for better compatibility
        const url = `https://financialmodelingprep.com/stable/quote/${tickers}?apikey=${FMP_API_KEY}`;
        const { data } = await axios.get(url);
        
        if (!data || data.length === 0) {
            throw new Error("API returned an empty array for market data.");
        }
        
        const dataMap = data.reduce((map, item) => (map[item.symbol] = item, map), {});
        
        // Helper to safely get data or return 'N/A'
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
