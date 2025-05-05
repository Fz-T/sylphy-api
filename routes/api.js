const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const creador = "I'm Fz ~";
let creator = "I'm Fz `";
const USERS_FILE = path.join(__dirname, '../users.json');

const resDefault = {
  invalidKey: {
    status: false,
    creador,
    code: 406,
    message: `Invalid API key.`
  },
  noLimit: {
    status: false,
    creador,
    message: 'API key usage limit reached.'
  },
  error: {
    status: false,
    creador,
    message: 'Server error or maintenance.'
  }
};

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function resetFreeKeys() {
  const users = loadUsers();
  users.forEach(user => {
    if (user.apikey.startsWith('sylph-') && user.limit < 100) {
      user.limit = 100;
    }
  });
  saveUsers(users);
  console.log('API keys limits reset.');
}

const msUntilMidnight = () => {
  const now = new Date();
  const mxOffset = -6;
  const mxNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const midnight = new Date(mxNow);
  midnight.setHours(24, 0, 0, 0);
  return midnight - mxNow;
};

setTimeout(() => {
  resetFreeKeys();
  setInterval(resetFreeKeys, 24 * 60 * 60 * 1000); 
}, msUntilMidnight());

function validateKey(apikey) {
  const users = loadUsers();
  const user = users.find(u => u.apikey === apikey);
  if (user) return { type: 'user', limit: user.limit };
  return null;
}

function useKey(apikey) {
  const users = loadUsers();
  const user = users.find(u => u.apikey === apikey);
  if (user && user.limit > 0) {
    user.limit--;
    saveUsers(users);
    return true;
  }
  return false;
}


/*****/
router.get('/endpoints', (req, res) => {
    const endpoints = {
        creator: "i'm Fz ~"
    };
    router.stack.forEach(layer => {
        if (layer.route) {
            const path = layer.route.path;
            const parts = path.split('/');
            if (parts.length > 2) {
                const category = parts[1];
                const name = parts[2];
                const fullPath = `/${name}`;
                if (!endpoints[category]) endpoints[category] = [];
                if (!endpoints[category].includes(fullPath)) endpoints[category].push(fullPath);
            }
        }
    });

    Object.keys(endpoints).forEach(cat => {
        if (cat !== 'creator') endpoints[cat].sort((a, b) => a.localeCompare(b));
    });

    endpoints.total = Object.keys(endpoints)
        .filter(key => key !== 'creator' && key !== 'total')
        .reduce((sum, key) => sum + endpoints[key].length, 0);

    res.json(endpoints);
});

router.get('/dl', (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'Missing key parameter' });

  const folder = path.join(__dirname, '../downloads');
  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error reading downloads folder' });

    const fileName = files.find(f => f.startsWith(key));
    if (!fileName) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(folder, fileName);
    res.sendFile(filePath, err => {
      if (!err) setTimeout(() => fs.unlink(filePath, () => {}), 5 * 60 * 1000);
    });
  });
});
/******/
router.get('/ikey', (req, res) => {
  const apikey = req.query.apikey;
  if (!apikey) return res.json(resDefault.invalidKey);

  const users = loadUsers();
  const user = users.find(u => u.apikey === apikey);
  if (!user) return res.json(resDefault.invalidKey);

  return res.json({
    status: true,
    creator,
    apikey: user.apikey,
    type: user.apikey.startsWith('sylph-') ? 'free' : 'vip',
    limit: user.limit,
    email: user.email,
    name: user.username
  });
});

router.get('/editkey', (req, res) => {
  const { apikey, limit, email, username, key } = req.query;
  if (key !== 'SYLPHIETTE') {
    return res.json({ status: false, message: 'Unauthorized master key' });
  }

  if (!apikey || !limit || (!email && !username)) {
    return res.json({ status: false, message: 'Missing parameters' });
  }

  const users = loadUsers();
  const user = users.find(u =>
    email ? u.email === email : u.username === username
  );

  if (!user) return res.json({ status: false, message: 'User not found' });

  user.apikey = apikey;
  user.limit = parseInt(limit);
  saveUsers(users);

  return res.json({
    status: true,
    message: `API key updated successfully for ${user.username}`,
    apikey: user.apikey,
    limit: user.limit
  });
});

/*****/

const yts = require('yt-search');

router.get('/search/yt', async (req, res) => {
  const apikey = req.query.apikey;
  const query = req.query.q;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!query) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 10).map(video => ({
      title: video.title,
      url: video.url,
      duration: video.timestamp,
      views: video.views,
      published: video.ago,
      author: video.author.name,
      channelID: video.author.url,
      thumbnail: video.thumbnail
    }));

    useKey(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: videos
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});
router.get('/download/ytmp4', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { ytmp4 } = require("../scrapers/youtube.js")
    const result = await ytmp4(url);
    useKey(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: result
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/ytmp3', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { ytmp3 } = require("../scrapers/youtube.js")
    const result = await ytmp3(url);
    useKey(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: result
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/spotify', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { Spotify } = require("../scrapers/spotify.js")
    const result = await Spotify(url);
    useKey(apikey, info.tipo);

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/search/spotify', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { search } = require("../scrapers/spotify.js")
    const ress = await search(q);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
})

router.get('/search/pinterest', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { pins } = require("../scrapers/pinterest.js")
    const ress = await pins(q);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/pinterest', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { pindl } = require("../scrapers/pinterest.js")
    const ress = await pindl(url);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/mediafire', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { mediafire } = require("../scrapers/mediafire.js")
    const ress = await mediafire(url);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/instagram', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { Instagram } = require("../scrapers/instagram.js")
    const ress = await Instagram(url);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/facebook', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { Facebook } = require("../scrapers/facebook.js")
    const ress = await Facebook(url);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/ai/chatgpt', async (req, res) => {
  const apikey = req.query.apikey;
  const text = req.query.text;
  
  if (!apikey) return res.json(resDefault.invalidKey);
  if (!text) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { openai } = require("../scrapers/openai.js")
    const ress = await openai(text);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/ai/blackbox', async (req, res) => {
  const apikey = req.query.apikey;
  const text = req.query.text;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!text) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { blackbox } = require("../scrapers/openai.js")
    const ress = await blackbox(text);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/tiktok', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { tiktok } = require("../scrapers/tiktok.js")
    const ress = await tiktok(url);
    useKey(apikey, info.tipo);
    return res.json(ress);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/npm', async (req, res) => {
  const apikey = req.query.apikey;
  const pkg = req.query.pkg;
  const version = req.query.version || "latest"

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!pkg) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { npmdl } = require("../scrapers/npmdl.js")
    const ress = await npmdl(pkg, version);
    useKey(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress
    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/tools/lyrics', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { Lyric } = require("../scrapers/lyrics.js")
    const ress = await Lyric(q);
    useKey(apikey, info.tipo);
    return res.json(ress);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/tools/hostinfo', async (req, res) => {
  const apikey = req.query.apikey;
  const domain = req.query.domain;

  if (!apikey) return res.json(resDefault.invalidKey);
  if (!domain) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validateKey(apikey);
  if (!info) return res.json(resDefault.invalidKey);

  if (info.limite <= 0) return res.json(resDefault.noLimit);

  try {
    const { hostInfo } = require("../scrapers/domainip.js")
    const ress = await hostInfo(domain);
    useKey(apikey, info.tipo);
    return res.json(ress);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});    

module.exports = router;
