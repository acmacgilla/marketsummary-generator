const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
    console.log("Received request for market data...");
    try {
        // NOTE: This is a stable snapshot of live data for demonstration.
        // A full live scraping implementation for all sources would go here.
        const data = {
            "reutersHeadlines": [
                "US stocks end lower as economic data fuels Fed policy jitters.",
                "Israel, Hezbollah exchange fire as border tensions escalate.",
                "US consumer prices accelerate in August; weekly jobless claims fall.",
                "ECB raises key interest rate to record high, signals peak may be near.",
                "Arm Holdings' shares surge in blockbuster market debut.",
                "Russia says it thwarted major Ukrainian drone attack on Crimea.",
                "UAW union launches simultaneous strikes at three Detroit automakers.",
                "China's central bank cuts reserve requirements to boost economy."
            ],
            "dataAnnouncements": [
                "US CPI (YoY, Aug): 3.7% vs consensus 3.6%",
                "US Core CPI (YoY, Aug): 4.3% vs consensus 4.3%",
                "US Initial Jobless Claims: 220K vs consensus 225K",
                "ECB Interest Rate Decision: 4.50% (Hike) vs consensus 4.50%",
                "US Retail Sales (MoM, Aug): 0.6% vs consensus 0.2%"
            ],
            "marketData": {
                "nasdaq": { "pct": -1.56, "close": "15,221.30", "up": "Moderna: +3.91%", "down": "Adobe: -4.21%" },
                "sp500": { "pct": -0.94, "close": "4,467.44", "up": "Albemarle: +3.80%", "down": "Dollar General: -4.68%" },
                "dow": { "pct": -0.84, "close": "34,474.83", "up": "Amgen: +1.89%", "down": "Intel: -2.99%" },
                "ftse": { "pct": 0.50, "close": "7,527.53", "up": "Next PLC: +2.33%", "down": "Ocado Group: -3.74%" },
                "dxy": { "pct": 0.61, "close": "105.35" }, "eurusd": { "pct": -0.75, "close": "1.0655" },
                "audusd": { "pct": -0.88, "close": "0.6438" }, "usdjpy": { "pct": 0.25, "close": "147.45" },
                "gbpusd": { "pct": -0.21, "close": "1.2485" }, "us10y": { "change": 0.05, "yield": "4.29%" },
                "us2y": { "change": 0.06, "yield": "5.02%" }, "jpn10y": { "change": 0.01, "yield": "0.70%" },
                "uk10y": { "change": 0.04, "yield": "4.38%" }, "btc": { "pct": 1.20, "close": "26,550" },
                "gold": { "pct": -0.20, "close": "1,932.80" }, "oil": { "pct": 1.95, "close": "90.16" },
                "vix": { "pct": 5.89, "close": "14.15" }
            },
            "rateTrackers": {
                "rba": { "meetingDate": "3 Oct 2025", "noChange": "88%", "ease": "12%" },
                "cme": { "meetingDate": "1 Nov 2025", "noChange": "97%", "ease25": "3%", "ease50": "0%" }
            },
            "economicCalendar": {
                "blurb": "After a volatile session driven by US inflation data and the ECB's rate decision, the market looks ahead to US consumer sentiment data. The University of Michigan's preliminary report for September will offer a key insight into household economic expectations. Additionally, reports on US industrial production and import/export prices will provide further details on the state of the economy.",
                "today": [ "22:30, US Import Price Index (MoM, Aug)", "23:15, US Industrial Production (MoM, Aug)", "23:59, UoM Consumer Sentiment (Sep, Prelim)" ],
                "tomorrow": [ "N/A - Quiet session expected." ]
            }
        };

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error("Error in serverless function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch market data" })
        };
    }
};
