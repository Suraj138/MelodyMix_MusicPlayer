import express from "express";
import { getSuggestions } from "node-youtube-music";
const router = express.Router();

function parseBetween(str, start, end) {
    return str.substring(
        str.lastIndexOf(start) + start.length,
        str.lastIndexOf(end)
    );
}

async function getVideo(id) {
    try {
        const response = await fetch("https://melody-mix-music-player.vercel.app//songs/id/" + id);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching video:", error);
        return null; // Return null on error
    }
}

async function parseVideoIDs(data) {
    try {
        const item = data.contents.twoColumnBrowseResultsRenderer.tabs[1].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].shelfRenderer.content.expandedShelfContentsRenderer.items;
        const videoIDs = await Promise.all(item.map(async (element) => {
            return await getVideo(element.videoRenderer.videoId);
        }));
        return videoIDs;
    } catch (error) {
        console.error("Error parsing video IDs:", error);
        return []; // Return empty array on error
    }
}

router.get('/trending', async (req, res) => {
    try {
        const response = await fetch("https://www.youtube.com/feed/trending?bp=4gINGgt5dG1hX2NoYXJ0cw%3D%3D");
        const html = await response.text();
        const data = JSON.parse(parseBetween(html, "var ytInitialData = ", ";</script><script nonce="));
        const trending = await parseVideoIDs(data);
        res.json(trending);
    } catch (error) {
        console.error("Error fetching trending videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
router.post("/getsuggestion", async (req, res) => {
    try {
        let userId = req.body.id;
        const response = await fetch("https://melody-mix-music-player.vercel.app/recentplayed/getrecents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: userId }),
        });
        const json = await response.json();
        const result1 = await Promise.all(json.map(async (element) => {
            const suggestions = await getSuggestions(element.youtubeId);
            return suggestions[1];
        }));
        const result2 = await Promise.all(json.map(async (element) => {
            const suggestions = await getSuggestions(element.youtubeId);
            return suggestions[2];
        }));
        result1.push(...result2);
        const uniqueYouTubeIds = new Set();

        // Filter out duplicate entries based on YouTube IDs
        const uniqueSongs = result1.filter(song => {
            if (uniqueYouTubeIds.has(song.youtubeId)) {
                return false; // Skip if YouTube ID is already encountered
            } else {
                uniqueYouTubeIds.add(song.youtubeId); // Add the YouTube ID to the set
                return true; // Include this song in the unique list
            }
        });
        res.json(uniqueSongs);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
async function getPlaylist(id) {
    try {
        const response = await fetch("https://melody-mix-music-player.vercel.app/songs/getplaylist/" + id);
        const data = await response.json();
        return data[0];
    } catch (error) {
        console.error("Error fetching video:", error);
        return null;
    }
}
async function parsePlaylistIDs(data) {
    try {
        const item = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].shelfRenderer.content.horizontalListRenderer.items;
        const videoIDs = await Promise.all(item.map(async (element) => {
            // return await getPlaylist(element.compactStationRenderer.navigationEndpoint.watchPlaylistEndpoint.playlistId);
            let item = await getPlaylist(element.compactStationRenderer.title.simpleText);
            item.playlistId = element.compactStationRenderer.navigationEndpoint.watchPlaylistEndpoint.playlistId;
            return item;
        }));
        return videoIDs;
    } catch (error) {
        console.error("Error parsing video IDs:", error);
        return [];
    }
}

router.get('/getTopPlaylist', async (req, res) => {
    try {
        const response = await fetch("https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ");
        const html = await response.text();
        const data = JSON.parse(parseBetween(html, "var ytInitialData = ", ";</script><script nonce="));
        const trending = await parsePlaylistIDs(data);
        res.json(trending);
    } catch (error) {
        console.error("Error fetching trending videos:", error);
    }
});

export default router;
