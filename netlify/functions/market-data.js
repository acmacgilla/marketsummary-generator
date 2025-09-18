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
    
    // Remove duplicate headlines and return the top 8 unique results
    const uniqueHeadlines = [...new Set(headlines)];
    return uniqueHeadlines.slice(0, 8);
}


// 2. Market Data (Reworked to use a unique request for every symbol)
async function fetchMarketData() {
    try {
        // --- Create a separate, unique request for every single symbol ---
        const gspcPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^GSPC&apikey=FMP_API_KEY`);
        const djiPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^DJI&apikey=FMP_API_KEY`);
        const ixicPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^IXIC&apikey=FMP_API_KEY`);
        const ftsePromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^FTSE&apikey=FMP_API_KEY`);
        const vixPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^VIX&apikey=FMP_API_KEY`);
        const eurusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^EURUSD&apikey=FMP_API_KEY`);
        const gbpusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^GBPUSD&apikey=FMP_API_KEY`);
        const usdjpyPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^USDJPY&apikey=FMP_API_KEY`);
        const audusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^AUDUSD&apikey=FMP_API_KEY`);
        const usdchfPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^USDCHF&apikey=FMP_API_KEY`);
        const btcusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^BTCUSD&apikey=FMP_API_KEY`);
        const ethusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^ETHUSD&apikey=FMP_API_KEY`);
        const gcusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^GCUSD&apikey=FMP_API_KEY`);
        const bzusdPromise = axios.get(`https://financialmodelingprep.com/stable/quote?symbol=^BZUSD&apikey=FMP_API_KEY`);
        
        // Use Promise.allSettled to ensure that one failed request does not stop the others
        const results = await Promise.allSettled([
            gspcPromise, djiPromise, ixicPromise, ftsePromise, vixPromise,
            eurusdPromise, gbpusdPromise, usdjpyPromise, audusdPromise, usdchfPromise,
            btcusdPromise, ethusdPromise, gcusdPromise, bzusdPromise
        ]);

        // Process all successful results into a single data map
        const dataMap = {};
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
                const data = result.value.data[0];
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
