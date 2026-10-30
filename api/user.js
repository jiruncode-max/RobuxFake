module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    const q = req.query || {};
    const UA = { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    };

    async function safeFetch(primaryUrl, options = {}) {
        try {
            const r = await fetch(primaryUrl, Object.assign({ headers: UA }, options));
            if (r.ok) return await r.json();
        } catch(e) {}

        try {
            const fallbackUrl = primaryUrl.replace('roblox.com', 'roproxy.com');
            const r2 = await fetch(fallbackUrl, Object.assign({ headers: UA }, options));
            if (r2.ok) return await r2.json();
        } catch(e) {}

        return null;
    }

    try {
        if (q.username) {
            const clean = q.username.trim().replace(/^@+/, '');
            let user = null;

            const postBody = JSON.stringify({ usernames: [clean], excludeBannedUsers: false });
            const data1 = await safeFetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, UA),
                body: postBody
            });

            if (data1 && data1.data && data1.data.length > 0) {
                const u = data1.data[0];
                user = { id: u.id, name: u.name, displayName: u.displayName || u.name };
            }

            if (!user) {
                const data2 = await safeFetch('https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(clean) + '&limit=10');
                if (data2 && data2.data && data2.data.length > 0) {
                    const exact = data2.data.find(u => u.name.toLowerCase() === clean.toLowerCase()) || data2.data[0];
                    user = { id: exact.id, name: exact.name, displayName: exact.displayName || exact.name };
                }
            }

            return res.status(200).json({ ok: true, found: !!user, user });
        }

        if (q.search) {
            const kw = encodeURIComponent(q.search.trim().replace(/^@+/, ''));
            const data = await safeFetch('https://users.roblox.com/v1/users/search?keyword=' + kw + '&limit=10');
            if (data && data.data) {
                return res.status(200).json({
                    ok: true,
                    results: data.data.map(u => ({ id: u.id, name: u.name, displayName: u.displayName || u.name }))
                });
            }
            return res.status(200).json({ ok: true, results: [] });
        }

        if (q.id) {
            const data = await safeFetch('https://users.roblox.com/v1/users/' + q.id);
            if (data && data.id && data.name) {
                return res.status(200).json({
                    ok: true, found: true,
                    user: { id: data.id, name: data.name, displayName: data.displayName || data.name }
                });
            }
            return res.status(200).json({ ok: true, found: false, user: null });
        }

        if (q.avatar) {
            const ids = String(q.avatar).split(',').filter(Boolean);
            const images = {};
            const data = await safeFetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + ids.join(',') + '&size=150x150&format=Png&isCircular=true');
            if (data && data.data) {
                data.data.forEach(d => { if (d.state === 'Completed' || d.imageUrl) images[d.targetId] = d.imageUrl; });
            }
            return res.status(200).json({ ok: true, images });
        }

        if (q.body) {
            const data = await safeFetch('https://thumbnails.roblox.com/v1/users/avatar?userIds=' + q.body + '&size=420x420&format=Png&isCircular=false');
            if (data && data.data && data.data[0] && data.data[0].imageUrl) {
                return res.status(200).json({ ok: true, imageUrl: data.data[0].imageUrl });
            }
            return res.status(200).json({ ok: false, imageUrl: null });
        }

        if (q.stats) {
            const id = q.stats;
            const stats = { friends: '-', followers: '-', following: '-' };
            try {
                const [f, fol, fing] = await Promise.all([
                    safeFetch('https://friends.roblox.com/v1/users/' + id + '/friends/count'),
                    safeFetch('https://friends.roblox.com/v1/users/' + id + '/followers/count'),
                    safeFetch('https://friends.roblox.com/v1/users/' + id + '/followings/count')
                ]);
                if (f && typeof f.count === 'number') stats.friends = f.count.toLocaleString('en-US');
                if (fol && typeof fol.count === 'number') stats.followers = fol.count.toLocaleString('en-US');
                if (fing && typeof fing.count === 'number') stats.following = fing.count.toLocaleString('en-US');
            } catch(e) {}
            return res.status(200).json({ ok: true, stats });
        }

        if (q.wearing) {
            const id = q.wearing;
            const data = await safeFetch('https://avatar.roblox.com/v1/users/' + id + '/avatar');
            if (data && data.assets && data.assets.length > 0) {
                const assets = data.assets.slice(0, 8);
                const assetIds = assets.map(a => a.id);

                const thumbData = await safeFetch('https://thumbnails.roblox.com/v1/assets?assetIds=' + assetIds.join(',') + '&size=150x150&format=Png&isCircular=false');
                const thumbMap = {};
                if (thumbData && thumbData.data) {
                    thumbData.data.forEach(item => { if (item.imageUrl) thumbMap[item.targetId] = item.imageUrl; });
                }

                return res.status(200).json({
                    ok: true,
                    items: assets.map(a => ({
                        id: a.id,
                        name: a.name || 'Item',
                        image: thumbMap[a.id] || `https://thumbnails.roblox.com/v1/assets?assetIds=${a.id}&size=150x150&format=Png`,
                        price: ((a.id % 45) + 35)
                    }))
                });
            }
            return res.status(200).json({ ok: true, items: [] });
        }

        return res.status(400).json({ ok: false, error: 'parameter_tidak_dikenal' });
    } catch (e) {
        return res.status(200).json({ ok: false, error: 'upstream_error' });
    }
};
