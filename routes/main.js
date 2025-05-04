__path = process.cwd()
const express = require('express');
const router = express.Router();

/*router.get('/', (req, res) => {
    res.render(__path + '/views/home.ejs')
})*/
router.get("/", (req, res) => {
  res.render("home");
});

router.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/users/login')
  const { username, email, apikey, limit } = req.session.user
  res.render('index', { username, email, apikey, limit })
})

router.get('/valor', (req, res) => {
    res.sendFile(__path + '/views/valor.html')
})

router.get('/config', (req, res) => {
config = {
status: true,
result: {
    prefix : '/',
    botName: 'Sylphiette | The Best',
    creator: "I'm Fz ~",
    github: "https://github.com/FzTeis"
   }
}
res.json(config)
})

module.exports = router