const express = require('express')
const cors = require('cors')
const secure = require('ssl-express-www')
const chalk = require("chalk");
const favicon = require("serve-favicon");
const path = require("path");
const PORT = 25565
const { color } = require('./lib/color.js')
const session = require('express-session')
const bodyParser = require('body-parser')
const fs = require('fs')
const crypto = require('crypto')

const mainrouter = require('./routes/main')
const apirouter = require('./routes/api')

const app = express()
app.enable('trust proxy');
app.set("json spaces", 2)
app.use(cors())
app.use(express.static("public"))
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use('/assets', express.static(path.join(__dirname, 'views', 'assets')))

app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: 'ichika-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))

const usersPath = path.join(__dirname, 'users.json')

if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]', 'utf-8')

app.use('/', mainrouter)
app.use('/', apirouter)

app.use("/", (req, res, next) => {
  global.host = "https://" + req.get('host');
  next();
});

let totalReq = 0;
app.use((req, res, next) => {
  totalReq++;
  const endpoint = req.originalUrl;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(
    chalk.green("🌱 Solicitud al endpoint:") + " " + chalk.blue(endpoint)
  );
  console.log(
    chalk.cyan("🌿 IP:") + " " + chalk.red(ip)
  );
  console.log(chalk.yellow("------"));
  next();
});

app.get("/req", (req, res) => {
  res.json({ creator: "I'm Fz ~", total: totalReq });
})

app.get('/users/login', (req, res) => {
  res.render('login')
})

app.get('/users/register', (req, res) => {
  res.render('register')
})

app.post('/users/login', (req, res) => {
  const { email, password, checkbox } = req.body
  if (!email || !password || !checkbox) return res.status(400).send('Missing fields')
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).send('Invalid credentials')
  req.session.user = user
  return res.redirect('/home')
})

app.post('/users/register', (req, res) => {
  const { username, email, password, checkbox } = req.body
  if (!username || !email || !password || !checkbox) return res.status(400).send('Missing fields')
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))
  const exists = users.find(u => u.email === email)
  if (exists) return res.status(409).send('User already exists')
  const apikey = 'sylph-' + crypto.randomBytes(5).toString('hex')
  const limit = 100
  const newUser = { username, email, password, apikey, limit }
  users.push(newUser)
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf-8')
  req.session.user = newUser
  return res.redirect('/home')
})

app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/users/login')
  const { username, email, apikey, limit } = req.session.user
  res.render('home', { username, email, apikey, limit })
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/users/login'))
})

app.listen(PORT, () => {
  console.log(color("Servidor abierto en el puerto " + PORT, 'green'))
})

module.exports = app