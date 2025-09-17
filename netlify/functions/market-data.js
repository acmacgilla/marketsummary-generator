const axios = require('axios');

// Access the new API keys from Netlify's environment variables
const FMP_API_KEY = process.env.FMP_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// --- Helper function to format percentage changes ---
const formatChange = (num) => (num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2));

// --- Data Fetching Functions ---

// 1. News Headlines
async function fetchNewsHeadlines() {
    try {
        // This endpoint is from the new News API documentation
        const url = `https://newsapi.org/v2/top-headlines?category=business&apiKey=${NEWS_API_KEY}`;
        const { data } = await axios.get(url);
        // The response contains an 'articles' array
        return data.articles.slice(0, 5).map(article => `- ${article.title}`);
    } catch (error) {
        console.error("Error fetching News API:", error.response ? error.response.data : error.message);
        return ["Error fetching news headlines."];
    }
}

// 2. Economic Calendar
async function fetchEconomicCalendar() {
    try {
        const now = new Date();
        const fromDate = new Date(now.getTime() - (15 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const toDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        // This endpoint and its parameters are from the new FMP documentation
        const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
        const { data } = await axios.get(url);
        
        const output = [];
        const announcements = data.filter(e => new Date(e.date) < now && e.actual != null);
        if (announcements.length > 0) {
            output.push("*Recent Data Announcements*");
            announcements.slice(0, 5).forEach(e => output.push(`- ${e.country} ${e.event}: ${e.actual}`));
            output.push("");
        }

        const today = data.filter(e => new Date(e.date) >= now && new Date(e.date).getDate() === now.getDate());
        if (today.length > 0) {
            output.push("*Today's Calendar (AEST)*");
            today.forEach(e => output.push(`- ${new Date(e.date).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })} ${e.country} ${e.event}`));
        }
        return output;
    } catch (error) {
        console.error("Error fetching Economic Calendar:", error.response ? error.response.data : error.message);
        return ["Error fetching calendar data."];
    }
}

// 3. Market Data
async function fetchMarketData() {
    try {
        // Use Promise.all to fetch from multiple endpoints concurrently
        const [nasdaqData, sp500Data, dowData, ftseData, fxData, cryptoData, commodityData, bondData] = await Promise.all([
            axios.get(`https://financialmodelingprep.com/stable/batch-exchange-quote?exchange=NASDAQ&short=true&apikey=${FMP_API_KEY}`),
            axios.get(`https://financialmodelingprep.com/stable/batch-exchange-quote?exchange=NYSE&short=true&apikey=${FMP_API_KEY}`), // S&P and Dow components are on NYSE
            axios.get(`https://financialmodelingprep.com/stable/batch-exchange-quote?exchange=EURONEXT&short=true&apikey=${FMP_API_KEY}`), // FTSE components
            axios.get(`https://financialmodelingprep.com/stable/quote-short?symbol=EURUSD,AUDUSD,USDJPY,GBPUSD&apikey=${FMP_API_KEY}`),
            axios.get(`https://financialmodelingprep.com/stable/quote-short?symbol=BTCUSD&apikey=${FMP_API_KEY}`),
            axios.get(`https://financialmodelingprep.com/stable/batch-commodity-quotes?short=true&apikey=${FMP_API_KEY}`),
            axios.get(`https://financialmodelingprep.com/stable/treasury-rates?apikey=${FMP_API_KEY}`)
        ]);
        
        // Find specific index proxies from the exchange data
        const nasdaq = nasdaqData.data.find(s => s.symbol === 'QQQ'); // QQQ as a proxy for Nasdaq 100
        const sp500 = sp500Data.data.find(s => s.symbol === 'SPY'); // SPY as a proxy for S&P 500
        const dow = sp500Data.data.find(s => s.symbol === 'DIA'); // DIA as a proxy for Dow Jones
        const ftse = ftseData.data.find(s => s.symbol === 'FLGB'); // iShares FTSE 100 as a proxy
        
        const fxMap = fxData.data.reduce((map, item) => (map[item.symbol] = item, map), {});
        const commodityMap = commodityData.data.reduce((map, item) => (map[item.symbol] = item, map), {});
        const latestBonds = bondData.data[0];

        const output = [];
        output.push("*Indices*");
        output.push(`- Nasdaq 100 (QQQ): ${formatChange(nasdaq.change)}, Last: ${nasdaq.price.toLocaleString()}`);
        output.push(`- S&P 500 (SPY): ${formatChange(sp500.change)}, Last: ${sp500.price.toLocaleString()}`);
        output.push(`- Dow Jones (DIA): ${formatChange(dow.change)}, Last: ${dow.price.toLocaleString()}`);
        output.push(`- FTSE 100 (FLGB): ${formatChange(ftse.change)}, Last: ${ftse.price.toLocaleString()}`);
        output.push("");
        output.push("*Currencies*");
        output.push(`- EUR/USD: ${formatChange(fxMap.EURUSD.change)}, Last: ${fxMap.EURUSD.price.toFixed(4)}`);
        output.push(`- AUD/USD: ${formatChange(fxMap.AUDUSD.change)}, Last: ${fxMap.AUDUSD.price.toFixed(4)}`);
        output.push(`- USD/JPY: ${formatChange(fxMap.USDJPY.change)}, Last: ${fxMap.USDJPY.price.toFixed(2)}`);
        output.push(`- GBP/USD: ${formatChange(fxMap.GBPUSD.change)}, Last: ${fxMap.GBPUSD.price.toFixed(4)}`);
        output.push("");
        output.push("*Bonds (Yields)*");
        output.push(`- US 10Y: ${latestBonds.year10}%`);
        output.push(`- US 2Y: ${latestBonds.year2}%`);
        output.push("");
        output.push("*Other Markets*");
        output.push(`- Bitcoin: ${formatChange(cryptoData.data[0].change)}, Last: ${cryptoData.data[0].price.toLocaleString()}`);
        output.push(`- Gold (GCUSD): ${formatChange(commodityMap.GCUSD.change)}, Last: ${commodityMap.GCUSD.price.toLocaleString()}`);
        output.push(`- WTI Oil (CLUSD): ${formatChange(commodityMap.CLUSD.change)}, Last: ${commodityMap.CLUSD.price.toLocaleString()}`);

        return output;
    } catch (error) {
         console.error("Error fetching Market Data:", error.response ? error.response.data : error.message);
         return ["Error fetching market data."];
    }
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    try {
        const [newsHeadlines, marketData, economicCalendar] = await Promise.all([
            fetchNewsHeadlines(),
            fetchMarketData(),
            fetchEconomicCalendar(),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({ newsHeadlines, marketData, economicCalendar })
        };
    } catch (error) {
        console.error("Fatal error in serverless function handler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch all data" })
        };
    }
};
