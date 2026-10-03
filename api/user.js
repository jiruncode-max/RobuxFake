// api/user.js — Jalur deteksi pribadi (server Vercel kamu → Roblox)
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Cache 60 detik di edge Vercel → lookup berulang jadi instan
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    const q = req.query || {};
    const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

    try {
        // ===== 1) CEK USERNAME PERSIS: /api/user?username=nama =====
        if (q.username) {
            const r = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, UA),
                body: JSON.stringify({ usernames: [q.username], excludeBannedUsers: false })
            });
            if (!r.ok) return res.status(200).json({ ok: false });
            const data = await r.json();
            const found = (data && data.data && data.data.length > 0) ? data.data[0] : null;
            return res.status(200).json({
                ok: true,
                found: !!found,
                user: found ? { id: found.id, name: found.name, displayName: found.displayName || found.name } : null
            });
        }

        // ===== 2) SEARCH: /api/user?search=kata =====
        if (q.search) {
            const kw = encodeURIComponent(q.search);
            // Jalur utama: endpoint website Roblox (sama dengan halaman /id/search/users)
            let r = await fetch('https://www.roblox.com/search/users/results?keyword=' + kw + '&maxRows=10&startIndex=0', { headers: UA });
            if (r.ok) {
                const data = await r.json();
                if (data && data.UserSearchResults && data.UserSearchResults.length) {
                    return res.status(200).json({
                        ok: true,
                        results: data.UserSearchResults.map(u => ({
                            id: u.Id, name: u.Name,
                            displayName: (u.DisplayName && u.DisplayName !== '') ? u.DisplayName : u.Name
                        }))
                    });
                }
            }
            // Cadangan: API v1
            r = await fetch('https://users.roblox.com/v1/users/search?keyword=' + kw + '&limit=10', { headers: UA });
            if (r.ok) {
                const data = await r.json();
                if (data && data.data) {
                    return res.status(200).json({
                        ok: true,
                        results: data.data.map(u => ({ id: u.id, name: u.name, displayName: u.displayName || u.name }))
                    });
                }
            }
            return res.status(200).json({ ok: false, results: [] });
        }

        // ===== 3) CARI BY ID: /api/user?id=123 =====
        if (q.id) {
            const r = await fetch('https://users.roblox.com/v1/users/' + q.id, { headers: UA });
            if (!r.ok) return res.status(200).json({ ok: true, found: false, user: null });
            const data = await r.json();
            if (data && data.id && data.name) {
                return res.status(200).json({ ok: true, found: true, user: { id: data.id, name: data.name, displayName: data.displayName || data.name } });
            }
            return res.status(200).json({ ok: true, found: false, user: null });
        }

        // ===== 4) AVATAR: /api/user?avatar=1,2,3 =====
        if (q.avatar) {
            const ids = String(q.avatar).split(',').filter(Boolean);
            const images = {};
            const r = await fetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + ids.join(',') + '&size=150x150&format=Png&isCircular=true', { headers: UA });
            if (r.ok) {
                const data = await r.json();
                if (data && data.data) {
                    data.data.forEach(d => { if (d.state === 'Completed') images[d.targetId] = d.imageUrl; });
                }
            }
            return res.status(200).json({ ok: true, images });
        }

        return res.status(400).json({ ok: false, error: 'parameter tidak dikenal' });
    } catch (e) {
        return res.status(200).json({ ok: false, error: 'upstream' });
    }
};
