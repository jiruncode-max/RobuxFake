'use strict';

/* =========================================
   KORBLOX GIFT - ROBLOX USER API
   ========================================= */

const USERS_API = "https://users.roblox.com";

const THUMBNAILS_API = "https://thumbnails.roblox.com";

/* =========================================
   RESPONSE
   ========================================= */

function send(res, status, data) {

    res.setHeader("Cache-Control", "no-store");

    return res.status(status).json(data);
}

/* =========================================
   FETCH JSON
   ========================================= */

async function fetchJSON(url, options = {}) {

    const response = await fetch(url, {
        ...options,

        headers: {
            Accept: "application/json",
            ...(options.headers || {})
        },

        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        throw new Error("Roblox API request failed");
    }

    return response.json();
}

/* =========================================
   NORMALIZE USER
   ========================================= */

function normalizeUser(user) {

    if (!user || !user.id) {
        return null;
    }

    return {
        id: Number(user.id),

        name: String(user.name || ""),

        displayName: String(
            user.displayName || user.name || ""
        ),

        hasVerifiedBadge:
            user.hasVerifiedBadge === true
    };
}

/* =========================================
   SEARCH BY USERNAME
   ========================================= */

async function getUserByUsername(username) {

    const data = await fetchJSON(
        USERS_API + "/v1/usernames/users",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: false
            })
        }
    );

    const result = data?.data?.[0];

    if (!result?.id) {
        return null;
    }

    return getUserById(result.id);
}

/* =========================================
   SEARCH BY USER ID
   ========================================= */

async function getUserById(id) {

    const userId = Number(id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return null;
    }

    const data = await fetchJSON(
        USERS_API + "/v1/users/" + userId
    );

    return normalizeUser(data);
}

/* =========================================
   AVATAR
   ========================================= */

async function getAvatar(id) {

    const userId = Number(id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return null;
    }

    const url =
        THUMBNAILS_API +
        "/v1/users/avatar-headshot" +
        "?userIds=" + userId +
        "&size=150x150" +
        "&format=Png" +
        "&isCircular=false";

    const data = await fetchJSON(url);

    return data?.data?.[0]?.imageUrl || null;
}

/* =========================================
   MAIN HANDLER
   ========================================= */

module.exports = async function handler(req, res) {

    if (req.method !== "GET") {

        return send(res, 405, {
            ok: false,
            message: "Method not allowed"
        });
    }

    try {

        const query = req.query || {};

        /* USERNAME */

        if (query.username !== undefined) {

            const username = String(query.username || "")
                .trim()
                .replace(/^@/, "");

            if (!username || username.length > 50) {

                return send(res, 400, {
                    ok: false,
                    message: "Username tidak valid."
                });
            }

            const user = await getUserByUsername(username);

            return send(res, 200, {
                ok: true,
                found: Boolean(user),
                user
            });
        }

        /* USER ID */

        if (query.id !== undefined) {

            const id = Number(query.id);

            if (!Number.isSafeInteger(id) || id <= 0) {

                return send(res, 400, {
                    ok: false,
                    message: "User ID tidak valid."
                });
            }

            const user = await getUserById(id);

            return send(res, 200, {
                ok: true,
                found: Boolean(user),
                user
            });
        }

        /* AVATAR */

        if (query.avatar !== undefined) {

            const id = Number(query.avatar);

            if (!Number.isSafeInteger(id) || id <= 0) {

                return send(res, 400, {
                    ok: false,
                    message: "User ID tidak valid."
                });
            }

            const image = await getAvatar(id);

            return send(res, 200, {
                ok: true,
                images: {
                    [id]: image
                }
            });
        }

        return send(res, 400, {
            ok: false,
            message: "Parameter API tidak ditemukan."
        });

    } catch (error) {

        console.error("Roblox API Error:", error.message);

        return send(res, 502, {
            ok: false,
            message:
                "Gagal mengambil data Roblox. Silakan coba lagi."
        });
    }
};
