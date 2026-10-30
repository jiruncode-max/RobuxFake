const MEMBERS = [
    { 
        username: "Jirun", 
        password: "JirunSmd27-", 
        name: "Jirun", 
        balance: 44400, 
        canEditBalance: true,
        role: "Owner" 
    },
    { 
        username: "jason88", 
        password: "jason88", 
        name: "Jirun", 
        balance: 44400, 
        canEditBalance: true,
        role: "Admin" 
    },
    { 
        username: "xxx", 
        password: "xxx", 
        name: "Jirun", 
        balance: 100, 
        canEditBalance: false,
        role: "Member" 
    },
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { 
        res.status(200).end(); 
        return; 
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch(e) {}
        } else if (!body) {
            const buffers = [];
            for await (const chunk of req) { buffers.push(chunk); }
            try { body = JSON.parse(Buffer.concat(buffers).toString()); } catch(e) {}
        }

        const { username, password } = body || {};

        if (!username || !password) {
            return res.status(200).json({ ok: false, message: 'Harap isi username dan password!' });
        }

        const cleanUser = String(username).trim().toLowerCase();
        const cleanPass = String(password).trim();

        const user = MEMBERS.find(m => 
            m.username.toLowerCase() === cleanUser && 
            m.password === cleanPass
        );

        if (user) {
            return res.status(200).json({
                ok: true,
                user: {
                    username: user.username,
                    name: user.name,
                    balance: user.balance,
                    canEditBalance: user.canEditBalance === true,
                    role: user.role,
                    token: Buffer.from(user.username + ':' + Date.now()).toString('base64')
                }
            });
        } else {
            return res.status(200).json({ 
                ok: false, 
                message: 'Akses ditolak! Username atau Password salah.' 
            });
        }
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'Server error' });
    }
};
