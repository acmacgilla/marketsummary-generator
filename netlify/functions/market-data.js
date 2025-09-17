const axios = require('axios');
const cheerio = require('cheerio');

// Access the API key from Netlify's environment variables
const FMP_API_KEY = process.env.FMP_API_KEY;

// --- Helper function to format percentage changes ---
const formatPct = (num) => (num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`);

// --- Data Fetching Functions ---

// 1. News Headlines (Using a reliable News API)
async function fetchNewsHeadlines() {
    // Access the second API key from Netlify's environment variables
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    try {
        const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&apiKey=${NEWS_API_KEY}`;
        const { data } = await axios.get(url);
        const headlines = data.articles.slice(0, 5).map(article => `- ${article.title}`);
        return headlines.length > 0 ? headlines : ["Could not fetch news headlines."];
    } catch (error) {
        console.error("Error fetching News API:", error.message);
        return ["Error fetching headlines."];
    }
}

// 2. Economic Calendar
async function fetchEconomicCalendar() {
    try {
        const now = new Date();
        const fromDate = new Date(now.getTime() - (15 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const toDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];

        const { data } = await axios.get(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`);
        
        const announcements = data.filter(e => new Date(e.date) < now && e.actual != null)
            .map(e => `${e.country} ${e.eventName}: ${e.actual} (Forecast: ${e.previous})`);

        const today = data.filter(e => new Date(e.date) >= now && new Date(e.date).getDate() === now.getDate())
            .map(e => `${new Date(e.date).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })} - ${e.country} ${e.eventName}`);

        const tomorrow = data.filter(e => new Date(e.date).getDate() === new Date(toDate).getDate())
            .map(e => `${new Date(e.date).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit' })} - ${e.country} ${e.eventName}`);

        return {
            blurb: "Live economic data sourced from API. Market focus remains on inflation and central bank commentary.",
            announcements: announcements.slice(0, 5), // Get the last 5 announcements
            today: today.length > 0 ? today : ["No major events scheduled for the rest of today."],
            tomorrow: tomorrow.length > 0 ? tomorrow : ["No major events scheduled for tomorrow."]
        };
    } catch (error) {
        console.error("Error fetching Economic Calendar:", error.message);
        return { blurb: "Error fetching calendar data.", announcements: [], today: [], tomorrow: [] };
    }
}


// 3, 4, 5, 6. Indices, FX, Bonds, and Other Markets
async function fetchMarketData() {
    try {
        const tickers = "NDAQ,^GSPC,^DJI,^FTSE,BTCUSD,EURUSD,AUDUSD,USDJPY,GBPUSD,GCUSD,CLUSD,^VIX";
        const { data: marketData } = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${FMP_API_KEY}`);
        const dataMap = marketData.reduce((map, item) => (map[item.symbol] = item, map), {});
        
        // Scrape bond yields from Yahoo Finance
        const { data: bondsHtml } = await axios.get('https://finance.yahoo.com/world-indices/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(bondsHtml);
        const us10y = $('fin-streamer[data-symbol="^TNX"]').text();
        const us2y = $('fin-streamer[data-symbol="^IRX"]').text(); // Using 13 week as proxy for 2Y

        return {
            nasdaq: { pct: formatPct(dataMap.NDAQ.changesPercentage), close: dataMap.NDAQ.price.toLocaleString(), up: "N/A", down: "N/A" },
            sp500: { pct: formatPct(dataMap['^GSPC'].changesPercentage), close: dataMap['^GSPC'].price.toLocaleString(), up: "N/A", down: "N/A" },
            dow: { pct: formatPct(dataMap['^DJI'].changesPercentage), close: dataMap['^DJI'].price.toLocaleString(), up: "N/A", down: "N/A" },
            ftse: { pct: formatPct(dataMap['^FTSE'].changesPercentage), close: dataMap['^FTSE'].price.toLocaleString(), up: "N/A", down: "N/A" },
            dxy: { pct: 0.00, close: "N/A" }, // DXY not available on free plan, placeholder
            eurusd: { pct: formatPct(dataMap.EURUSD.changesPercentage), close: dataMap.EURUSD.price.toFixed(4) },
            audusd: { pct: formatPct(dataMap.AUDUSD.changesPercentage), close: dataMap.AUDUSD.price.toFixed(4) },
            usdjpy: { pct: formatPct(dataMap.USDJPY.changesPercentage), close: dataMap.USDJPY.price.toFixed(2) },
            gbpusd: { pct: formatPct(dataMap.GBPUSD.changesPercentage), close: dataMap.GBPUSD.price.toFixed(4) },
            us10y: { yield: `${((us10y / 10)).toFixed(2)}%`, change: 0.00 }, // Yahoo provides price, not yield % directly
            us2y: { yield: `${((us2y / 10)).toFixed(2)}%`, change: 0.00 },
            jpn10y: { yield: "0.95%", change: 0.00 }, // Placeholder
            uk10y: { yield: "4.06%", change: 0.00 }, // Placeholder
            btc: { pct: formatPct(dataMap.BTCUSD.changesPercentage), close: dataMap.BTCUSD.price.toLocaleString() },
            gold: { pct: formatPct(dataMap.GCUSD.changesPercentage), close: dataMap.GCUSD.price.toLocaleString() },
            oil: { pct: formatPct(dataMap.CLUSD.changesPercentage), close: dataMap.CLUSD.price.toLocaleString() },
            vix: { pct: formatPct(dataMap['^VIX'].changesPercentage), close: dataMap['^VIX'].price.toFixed(2) },
        };
    } catch (error) {
         console.error("Error fetching Market Data:", error.message);
         return { error: "Failed to fetch market data" };
    }
}

// 7. Rate Trackers (Scraping)
async function scrapeRateTrackers() {
    try {
        // CME FedWatch Tool
        const { data: cmeHtml } = await axios.get('https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $cme = cheerio.load(cmeHtml);
        const cmeProbabilities = $cme('#fedwatch-tool-table-1 tbody tr td:nth-child(3)').map((i, el) => $(el).text().trim()).get();
        
        // ASX RBA Rate Tracker
        const { data: asxHtml } = await axios.get('https://www.asx.com.au/data/trt/ib_expectation_curve.json');

        return {
            cme: { meetingDate: "1 Nov 2025", noChange: `${cmeProbabilities[0] || 'N/A'}`, ease25: `${cmeProbabilities[1] || 'N/A'}`, ease50: "0%" },
            rba: { meetingDate: asxHtml[0]?.meeting_date_display, noChange: `${(asxHtml[0]?.p_no_change*100).toFixed(0)}%` || 'N/A', ease: `${(asxHtml[0]?.p_decrease_25*100).toFixed(0)}%` || 'N/A' }
        };
    } catch (error) {
        console.error("Error scraping Rate Trackers:", error.message);
        return { cme: { noChange: 'Error' }, rba: { noChange: 'Error' } };
    }
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    try {
        const [
            reutersHeadlines,
            marketData,
            calendarData,
            rateTrackers
        ] = await Promise.all([
            fetchNewsHeadlines(),
            fetchMarketData(),
            fetchEconomicCalendar(),
            scrapeRateTrackers()
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                reutersHeadlines,
                dataAnnouncements: calendarData.announcements,
                marketData,
                rateTrackers,
                economicCalendar: {
                    blurb: calendarData.blurb,
                    today: calendarData.today,
                    tomorrow: calendarData.tomorrow
                }
            })
        };
    } catch (error) {
        console.error("Error in serverless function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch market data" })
        };
    }
};
