const express = require("express");
const axios = require("axios");
const moment = require("moment");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
};

// Serve the HTML form
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Fetch user details
app.get("/fetch/:username", async (req, res) => {
    const username = req.params.username;
    const details = await fetchChessDetails(username);

    if (details.error) {
        return res.send(details.error);
    }

    res.send(details.result.replace(/\n/g, "<br>")); // Convert new lines to HTML
});

// Fetch playtime separately
app.get("/fetch/playtime/:username", async (req, res) => {
    const username = req.params.username;
    const details = await fetchChessDetails(username);

    if (details.error) {
        return res.status(400).json({ error: details.error });
    }

    let totalSeconds = 0;
    let monthlyPlaytime = {};
    const currentDate = moment().utc();
    let { joinedYear: year, joinedMonth: month } = details;
    const gamesUrl = `https://api.chess.com/pub/player/${username}/games/`;

    while (year < currentDate.year() || (year === currentDate.year() && month <= currentDate.month() + 1)) {
        const url = `${gamesUrl}${year}/${month.toString().padStart(2, "0")}`;
        try {
            const response = await axios.get(url, { headers: HEADERS });
            if (response.status === 200) {
                const games = response.data.games || [];
                for (const game of games) {
                    const pgn = game.pgn || "";
                    const startTimeMatch = pgn.match(/\[StartTime \"(\d{2}:\d{2}:\d{2})\"\]/);
                    const endTimeMatch = pgn.match(/\[EndTime \"(\d{2}:\d{2}:\d{2})\"\]/);

                    if (startTimeMatch && endTimeMatch) {
                        const startTime = moment(startTimeMatch[1], "HH:mm:ss");
                        const endTime = moment(endTimeMatch[1], "HH:mm:ss");
                        if (endTime.isBefore(startTime)) {
                            endTime.add(1, "days");
                        }
                        const duration = endTime.diff(startTime, "seconds");
                        if (duration <= 4800) {
                            totalSeconds += duration;
                            const key = `${year}-${month.toString().padStart(2, "0")}`;
                            monthlyPlaytime[key] = (monthlyPlaytime[key] || 0) + duration;
                        }
                    }
                }
            }
        } catch (err) {}
        month++;
        if (month > 12) { month = 1; year++; }
    }

    res.json({
        totalTimePlayed: formatDuration(totalSeconds),
        monthlyBreakdown: Object.fromEntries(
            Object.entries(monthlyPlaytime).map(([month, duration]) => [month, formatDuration(duration)])
        ),
    });
});

// Helper functions
const formatDuration = (seconds) => {
    const duration = moment.duration(seconds, "seconds");
    return `${Math.floor(duration.asHours())}h ${duration.minutes()}m ${duration.seconds()}s`;
};

const fetchChessDetails = async (username) => {
    username = username.toLowerCase();
    const profileUrl = `https://api.chess.com/pub/player/${username}`;
    const statsUrl = `https://api.chess.com/pub/player/${username}/stats`;

    try {
        const [profileResponse, statsResponse] = await Promise.all([
            axios.get(profileUrl, { headers: HEADERS }),
            axios.get(statsUrl, { headers: HEADERS })
        ]);

        if (profileResponse.status !== 200) {
            return { error: `❌ Username '${username}' not found. Please check and try again.` };
        }

        const profileData = profileResponse.data;
        const statsData = statsResponse.data;

        const lastOnlineIst = profileData.last_online ? convertUtcToIst(moment.unix(profileData.last_online).utc().format("YYYY-MM-DD HH:mm:ss")) : "N/A";
        const joinedIst = profileData.joined ? convertUtcToIst(moment.unix(profileData.joined).utc().format("YYYY-MM-DD HH:mm:ss")) : "N/A";

        let result = `✅ Username: ${username}\n`;
        result += `🔹 Name: ${profileData.name || "N/A"}\n`;
        result += `🔹 Country: ${profileData.country?.split("/").pop() || "N/A"}\n`;
        result += `🔹 Membership: ${profileData.status || "N/A"}\n`;
        result += `🔹 Joined On: ${joinedIst} IST\n`;
        result += `🔹 Last Online: ${lastOnlineIst} IST\n`;
        result += `🔹 Friends: ${profileData.followers || "N/A"}\n`;
        result += `🔹 Title: ${profileData.title || "N/A"}\n`;


        // Capture rating information
        result += "\n🔹 Ratings:\n";
        const ratingCategories = {
            "chess_blitz": "Blitz",
            "chess_bullet": "Bullet",
            "chess_rapid": "Rapid",
            "chess_daily": "Daily",
            "chess960_daily": "Chess960 Daily"
        };

        let totalGames = 0;
        for (const key in ratingCategories) {
            if (statsData[key]) {
                const formatName = ratingCategories[key];
                const rating = statsData[key]?.last?.rating || "N/A";
                const games = (statsData[key]?.record?.win || 0) + 
                              (statsData[key]?.record?.loss || 0) + 
                              (statsData[key]?.record?.draw || 0);
                totalGames += games;
                result += `   🔸 ${formatName}: ${rating} (${games} games)\n`;
            }
        }

        result += `   🔸 Total Games : ${totalGames}\n`;

        return { result, username, joinedYear: moment.unix(profileData.joined).utc().year(), joinedMonth: moment.unix(profileData.joined).utc().month() + 1 };
    } catch (error) {
        return { error: `❌ API Request Failed: ${error.message}. Please try again later.` };
    }
};



const convertUtcToIst = (utcTimeStr) => {
    return moment.utc(utcTimeStr).add(5, "hours").add(30, "minutes").format("YYYY-MM-DD HH:mm:ss");
};

// Start the server
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
