"use strict";

const USERS_API = "https://users.roblox.com";
const THUMBNAILS_API = "https://thumbnails.roblox.com";

function send(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(data);
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error("Roblox API: " + response.status);
  }

  return response.json();
}

function normalizeUser(user) {
  if (!user || !user.id) return null;

  return {
    id: Number(user.id),
    name: String(user.name || ""),
    displayName: String(
      user.displayName || user.name || ""
    )
  };
}

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

  if (!result?.id) return null;

  return getUserById(result.id);
}

async function getAvatar(id) {
  const userId = Number(id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return null;
  }

  const data = await fetchJSON(
    THUMBNAILS_API +
    "/v1/users/avatar-headshot" +
    "?userIds=" + userId +
    "&size=150x150" +
    "&format=Png" +
    "&isCircular=false"
  );

  return data?.data?.[0]?.imageUrl || null;
}

async function getBundleImage() {
  const data = await fetchJSON(
    THUMBNAILS_API +
    "/v1/bundles/thumbnails" +
    "?bundleIds=192" +
    "&size=420x420" +
    "&format=Png" +
    "&isCircular=false"
  );

  return data?.data?.[0]?.imageUrl || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return send(res, 405, {
      ok: false,
      message: "Method not allowed"
    });
  }

  try {
    const query = req.query || {};

    if (query.bundleImage !== undefined) {
      const image = await getBundleImage();

      return send(res, image ? 200 : 404, {
        ok: Boolean(image),
        image
      });
    }

    if (query.username !== undefined) {
      const username = String(query.username || "")
        .trim()
        .replace(/^@/, "");

      if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
        return send(res, 400, {
          ok: false,
          message: "Username Roblox tidak valid."
        });
      }

      const user = await getUserByUsername(username);

      if (!user) {
        return send(res, 404, {
          ok: false,
          message: "Username Roblox tidak ditemukan."
        });
      }

      return send(res, 200, {
        ok: true,
        user
      });
    }

    if (query.id !== undefined) {
      const user = await getUserById(query.id);

      if (!user) {
        return send(res, 404, {
          ok: false,
          message: "User ID tidak ditemukan."
        });
      }

      return send(res, 200, {
        ok: true,
        user
      });
    }

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
      message: "Parameter tidak ditemukan."
    });

  } catch (error) {
    console.error("Roblox API:", error.message);

    return send(res, 502, {
      ok: false,
      message: "Gagal mengambil data Roblox. Coba lagi."
    });
  }
};
