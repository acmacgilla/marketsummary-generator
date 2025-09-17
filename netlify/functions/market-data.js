const axios = require('axios');

// Access API keys from Netlify's environment variables
const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// --- Helper function to format percentage changes ---
const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// --- Data Fetching Functions ---

// 1. News Headlines (No changes needed)
async function fetchNewsHeadlines() {
    try {
        const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&apiKey=${NEWS_API_KEY}`;
        const { data } = await axios.get(url);
        return data.articles.slice(0, 5).map(article => `- ${article.title}`);
    } catch (error) {
        console.error("Error fetching News API:", error.message);
        return ["Error fetching headlines."];
    }
}

// 2. Economic Calendar (Reworked to return a simple array of strings)
async function fetchEconomicCalendar() {
    try {
        const now = new Date();
        const fromDate = new Date(now.getTime() - (15 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const toDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const { data } = await axios.get(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`);
        
        const output = [];

        const announcements = data.filter(e => new Date(e.date) < now && e.actual != null);
        if (announcements.length > 0) {
            output.push("*Recent Data Announcements*");
            announcements.slice(0, 5).forEach(e => output.push(`- ${e.country} ${e.eventName}: ${e.actual}`));
            output.push(""); // Add a space
        }

        const today = data.filter(e => new Date(e.date) >= now && new Date(e.date).getDate() === now.getDate());
        if (today.length > 0) {
            output.push("*Today's Calendar (AEST)*");
            today.forEach(e => output.push(`- ${new Date(e.date).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })} ${e.country} ${e.eventName}`));
        }

        return output;
    } catch (error) {
        console.error("Error fetching Economic Calendar:", error.message);
        return ["Error fetching calendar data."];
    }
}

// 3. Market Data (Reworked to return a simple array of strings)
async function fetchMarketData() {
    try {
        const tickers = "NDAQ,^GSPC,^DJI,^FTSE,BTCUSD,EURUSD,AUDUSD,USDJPY,GBPUSD,GCUSD,CLUSD,^VIX";
        const { data: marketData } = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${FMP_API_KEY}`);
        const dataMap = marketData.reduce((map, item) => (map[item.symbol] = item, map), {});

        const output = [];

        output.push("*Indices*");
        output.push(`- US Nasdaq: ${formatPct(dataMap.NDAQ.changesPercentage)}, Last: ${dataMap.NDAQ.price.toLocaleString()}`);
        output.push(`- US S&P 500: ${formatPct(dataMap['^GSPC'].changesPercentage)}, Last: ${dataMap['^GSPC'].price.toLocaleString()}`);
        output.push(`- US Dow Jones: ${formatPct(dataMap['^DJI'].changesPercentage)}, Last: ${dataMap['^DJI'].price.toLocaleString()}`);
        output.push(`- UK FTSE 100: ${formatPct(dataMap['^FTSE'].changesPercentage)}, Last: ${dataMap['^FTSE'].price.toLocaleString()}`);
        output.push("");

        output.push("*Currencies*");
        output.push(`- EUR/USD: ${formatPct(dataMap.EURUSD.changesPercentage)}, Last: ${dataMap.EURUSD.price.toFixed(4)}`);
        output.push(`- AUD/USD: ${formatPct(dataMap.AUDUSD.changesPercentage)}, Last: ${dataMap.AUDUSD.price.toFixed(4)}`);
        output.push(`- USD/JPY: ${formatPct(dataMap.USDJPY.changesPercentage)}, Last: ${dataMap.USDJPY.price.toFixed(2)}`);
        output.push(`- GBP/USD: ${formatPct(dataMap.GBPUSD.changesPercentage)}, Last: ${dataMap.GBPUSD.price.toFixed(4)}`);
        output.push("");
        
        output.push("*Other Markets ($USD)*");
        output.push(`- Bitcoin: ${formatPct(dataMap.BTCUSD.changesPercentage)}, Last: ${dataMap.BTCUSD.price.toLocaleString()}`);
        output.push(`- Gold: ${formatPct(dataMap.GCUSD.changesPercentage)}, Last: ${dataMap.GCUSD.price.toLocaleString()}`);
        output.push(`- WTI Oil: ${formatPct(dataMap.CLUSD.changesPercentage)}, Last: ${dataMap.CLUSD.price.toLocaleString()}`);
        output.push(`- VIX: ${formatPct(dataMap['^VIX'].changesPercentage)}, Last: ${dataMap['^VIX'].price.toFixed(2)}`);

        return output;
    } catch (error) {
         console.error("Error fetching Market Data:", error.message);
         return ["Error fetching market data"];
    }
}


// --- Main Handler ---
exports.handler = async function(event, context) {
    try {
        const [
            newsHeadlines,
            marketData,
            economicCalendar
        ] = await Promise.all([
            fetchNewsHeadlines(),
            fetchMarketData(),
            fetchEconomicCalendar(),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                newsHeadlines,
                marketData,
                economicCalendar
            })
        };
    } catch (error) {
        console.error("Error in serverless function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch all data" })
        };
    }
};
