const axios = require("axios")
const cheerio = require("cheerio")

async function hostInfo(link) {
try {
const anu = await axios.get(`https://check-host.net/ip-info?host=${link}`)
const $ = cheerio.load(anu.data)
const dbres = {
status: true,
creator: "I'm Fz ~",
domain: link,
info: []
}

const ip = $(".break-all").eq(1).text()
const name = $(".break-all").eq(2).text()
const range = $("td.break-all").eq(3).text()
const isp = $(".break-all").eq(4).text()
const organisation = $(".break-all").eq(5).text()
const region = $(".break-all").eq(6).text().trim()
const city = $(".break-all").eq(7).text().trim()
const tzone = $(".break-all").eq(8).text().trim()
const ltime = $(".break-all").eq(9).text().trim()
const pcode = $(".break-all").eq(10).text()
dbres.info.push({ ip, name, range, isp, organisation, region, city, tzone, ltime, pcode })

return dbres
} catch (err) {
console.log(err)
}
}

module.exports = { hostInfo }
