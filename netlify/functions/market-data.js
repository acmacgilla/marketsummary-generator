const axios = require('axios');

const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const WORLD_NEWS_API_KEY = process.env.WORLD_NEWS_API_KEY;

const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// 1. News Headlines (This function is correct and remains the same)
async function fetchNewsHeadlines() {
    const worldNewsPromise = axios.get(`https://api.worldnewsapi.com/top-news?source-country=us&language=en`, {
        headers: { 'x-api-key': WORLD_NEWS_API_KEY }
    });
    const newsApiPromise = axios.get(`https://newsapi.org/v2/top-headlines?category=business&apiKey=${NEWS_API_KEY}`);
    const results = await Promise.allSettled([worldNewsPromise, newsApiPromise]);
    let headlines = [];
    if (results[0].status === 'fulfilled' && results[0].value.data.top_news) {
        const worldNews = results[0].value.data.top_news.slice(0, 5).map(cluster => `- ${cluster.news[0].title}`);
        headlines.push(...worldNews);
    } else {
        console.error("World News API failed:", results[0].reason?.response?.data || "Unknown Error");
    }
    if (results[1].status === 'fulfilled' && results[1].value.data.articles) {
        const newsApiArticles = results[1].value.data.articles.slice(0, 5).map(article => `- ${article.title}`);
        headlines.push(...newsApiArticles);
    } else {
        console.error("NewsAPI failed:", results[1].reason?.response?.data || "Unknown Error");
    }
    if (headlines.length === 0) {
        return ["- Could not fetch headlines from any source."];
    }
    const uniqueHeadlines = [...new Set(headlines)];
    return uniqueHeadlines.slice(0, 7);
}

// 2. Market Data (Reworked to make one API call per symbol)
async function fetchMarketData() {
    try {
        const symbols = [
            // Indices
            "^GSPC", "^DJI", "^IXIC", "^FTSE", "^VIX",
            // Currencies
            "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF",
            // Crypto
            "BTCUSD", "ETHUSD",
            // Commodities
            "GCUSD", "BZUSD"
        ];

        // Create an array of promises, one for each symbol request
        const promises = symbols.map(symbol =>
            axios.get(`https://financialmodelingprep.com/stable/quote/${symbol}?apikey=${FMP_API_KEY}`)
        );

        // Execute all requests concurrently
        const responses = await Promise.all(promises);

        // Process all responses into a single data map
        const dataMap = {};
        responses.forEach(response => {
            const data = response.data[0]; // The API returns an array with one item
            if (data && data.symbol) {
                dataMap[data.symbol] = data;
            }
        });
        
        const get = (symbol, field, toLocale = false) => {
            if (dataMap[symbol] && dataMap[symbol][field] !== undefined) {
                const value = dataMap[symbol][field];
                return typeof value === 'number' && toLocale ? value.toLocaleString() : value;
            }
            return 'N/A';
        };

        const output = [];
        output.push("*Indices*");
        output.push(`- ${get('^GSPC', 'name')}: ${formatPct(get('^GSPC', 'changePercentage'))}, Last: ${get('^GSPC', 'price', true)}`);
        output.push(`- ${get('^DJI', 'name')}: ${formatPct(get('^DJI', 'changePercentage'))}, Last: ${get('^DJI', 'price', true)}`);
        output.push(`- ${get('^IXIC', 'name')}: ${formatPct(get('^IXIC', 'changePercentage'))}, Last: ${get('^IXIC', 'price', true)}`);
        output.push(`- ${get('^FTSE', 'name')}: ${formatPct(get('^FTSE', 'changePercentage'))}, Last: ${get('^FTSE', 'price', true)}`);
        output.push(`- ${get('^VIX', 'name')}: ${formatPct(get('^VIX', 'changePercentage'))}, Last: ${get('^VIX', 'price').toFixed(2)}`);
        output.push("");

        output.push("*Currencies*");
        output.push(`- ${get('EURUSD', 'name')}: ${formatPct(get('EURUSD', 'changePercentage'))}, Last: ${get('EURUSD', 'price').toFixed(4)}`);
        output.push(`- ${get('GBPUSD', 'name')}: ${formatPct(get('GBPUSD', 'changePercentage'))}, Last: ${get('GBPUSD', 'price').toFixed(4)}`);
        output.push(`- ${get('USDJPY', 'name')}: ${formatPct(get('USDJPY', 'changePercentage'))}, Last: ${get('USDJPY', 'price').toFixed(2)}`);
        output.push(`- ${get('AUDUSD', 'name')}: ${formatPct(get('AUDUSD', 'changePercentage'))}, Last: ${get('AUDUSD', 'price').toFixed(4)}`);
        output.push(`- ${get('USDCHF', 'name')}: ${formatPct(get('USDCHF', 'changePercentage'))}, Last: ${get('USDCHF', 'price').toFixed(4)}`);
        output.push("");
        
        output.push("*Crypto & Commodities*");
        output.push(`- ${get('BTCUSD', 'name')}: ${formatPct(get('BTCUSD', 'changePercentage'))}, Last: ${get('BTCUSD', 'price', true)}`);
        output.push(`- ${get('ETHUSD', 'name')}: ${formatPct(get('ETHUSD', 'changePercentage'))}, Last: ${get('ETHUSD', 'price', true)}`);
        output.push(`- ${get('GCUSD', 'name')}: ${formatPct(get('GCUSD', 'changePercentage'))}, Last: ${get('GCUSD', 'price', true)}`);
        output.push(`- ${get('BZUSD', 'name')}: ${formatPct(get('BZUSD', 'changePercentage'))}, Last: ${get('BZUSD', 'price', true)}`);

        return output;
    } catch (error) {
         console.error("Error fetching Market Data:", error.message);
         if (error.response) {
            console.error("Error Details:", error.response.data);
         }
         return ["Error fetching market data. Please check the function logs and API key."];
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
