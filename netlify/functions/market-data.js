const axios = require('axios');

// Access API keys from Netlify's environment variables
const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// --- Helper function to format percentage changes ---
const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// --- Data Fetching Functions ---

// 1. News Headlines (This function is correct and remains the same)
async function fetchNewsHeadlines() {
    try {
        const url = `https://newsapi.org/v2/top-headlines?category=business&apiKey=${NEWS_API_KEY}`;
        const { data } = await axios.get(url);
        return data.articles.slice(0, 5).map(article => `- ${article.title}`);
    } catch (error) {
        console.error("Error fetching News API:", error.response ? error.response.data : error.message);
        return ["Error fetching news headlines."];
    }
}

// 2. Market Data (Reworked to use the correct '/quote' endpoint)
async function fetchMarketData() {
    try {
        // All symbols are combined into one efficient API call
        const tickers = "^GSPC,^DJI,^IXIC,^FTSE,^VIX,EURUSD,GBPUSD,USDJPY,AUDUSD,USDCHF,BTCUSD,ETHUSD,GCUSD,BZUSD";
        const url = `https://financialmodelingprep.com/stable/quote/${tickers}?apikey=${FMP_API_KEY}`;
        const { data } = await axios.get(url);
        
        // Create a map for easy lookups
        const dataMap = data.reduce((map, item) => (map[item.symbol] = item, map), {});

        const output = [];
        output.push("*Indices*");
        output.push(`- S&P 500: ${formatPct(dataMap['^GSPC'].changePercentage)}, Last: ${dataMap['^GSPC'].price.toLocaleString()}`);
        output.push(`- Dow Jones: ${formatPct(dataMap['^DJI'].changePercentage)}, Last: ${dataMap['^DJI'].price.toLocaleString()}`);
        output.push(`- Nasdaq Comp: ${formatPct(dataMap['^IXIC'].changePercentage)}, Last: ${dataMap['^IXIC'].price.toLocaleString()}`);
        output.push(`- FTSE 100: ${formatPct(dataMap['^FTSE'].changePercentage)}, Last: ${dataMap['^FTSE'].price.toLocaleString()}`);
        output.push(`- VIX: ${formatPct(dataMap['^VIX'].changePercentage)}, Last: ${dataMap['^VIX'].price.toFixed(2)}`);
        output.push("");

        output.push("*Currencies*");
        output.push(`- EUR/USD: ${formatPct(dataMap.EURUSD.changePercentage)}, Last: ${dataMap.EURUSD.price.toFixed(4)}`);
        output.push(`- GBP/USD: ${formatPct(dataMap.GBPUSD.changePercentage)}, Last: ${dataMap.GBPUSD.price.toFixed(4)}`);
        output.push(`- USD/JPY: ${formatPct(dataMap.USDJPY.changePercentage)}, Last: ${dataMap.USDJPY.price.toFixed(2)}`);
        output.push(`- AUD/USD: ${formatPct(dataMap.AUDUSD.changePercentage)}, Last: ${dataMap.AUDUSD.price.toFixed(4)}`);
        output.push(`- USD/CHF: ${formatPct(dataMap.USDCHF.changePercentage)}, Last: ${dataMap.USDCHF.price.toFixed(4)}`);
        output.push("");
        
        output.push("*Crypto & Commodities*");
        output.push(`- Bitcoin: ${formatPct(dataMap.BTCUSD.changePercentage)}, Last: ${dataMap.BTCUSD.price.toLocaleString()}`);
        output.push(`- Ethereum: ${formatPct(dataMap.ETHUSD.changePercentage)}, Last: ${dataMap.ETHUSD.price.toLocaleString()}`);
        output.push(`- Gold (GCUSD): ${formatPct(dataMap.GCUSD.changePercentage)}, Last: ${dataMap.GCUSD.price.toLocaleString()}`);
        output.push(`- Brent Crude (BZUSD): ${formatPct(dataMap.BZUSD.changePercentage)}, Last: ${dataMap.BZUSD.price.toLocaleString()}`);

        return output;
    } catch (error) {
         console.error("Error fetching Market Data:", error.response ? error.response.data : error.message);
         return ["Error fetching market data. Check your FMP API key."];
    }
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    try {
        // We only need to call two functions now
        const [newsHeadlines, marketData] = await Promise.all([
            fetchNewsHeadlines(),
            fetchMarketData(),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({ newsHeadlines, marketData }) // Removed economicCalendar
        };
    } catch (error) {
        console.error("Fatal error in serverless function handler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch all data" })
        };
    }
};
