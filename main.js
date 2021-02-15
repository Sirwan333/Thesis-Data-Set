const request = require('request-promise')
const cheerio = require('cheerio')
const fs = require('fs');

const url = "https://bz.apache.org/bugzilla/buglist.cgi?bug_status=__closed__&no_redirect=1&order=Importance&product=Tomcat%2010&query_format=specific"
const array = []
const arrayIDs = []
const arrayImportance = []
const arrayStatus = []
const arrayReported = []
const arrayModified = []
const arrayDependOn = []
const arraySummary = []

let myObject = {}

async function startScraping () {
    return new Promise((resolve, reject) => {  
         request(url, (err, response, html) => {
            if (!err && response.statusCode === 200) {
            const $ = cheerio.load(html)
            const elemnt = $('tbody').children('tr')
            $(elemnt).each((i, el) => {
                if (i > 0) {
                    const url = $(el).find('a').attr('href')
                    const id = $(el).find('td:first-child').text().replace(/\s\s+/g, '')
                    const status = $(el).find('td:nth-child(5)').text().replace(/\s\s+/g, '')
                    const summary = $(el).find('td:nth-child(7)').text().replace(/\s\s+/g, '')
                    arrayIDs.push(id)
                    array.push(url)
                    arrayStatus.push(status)
                    arraySummary.push(summary)
                }
                
            })
            console.log('Scraping links...OK')
            resolve()
            }
        })
    }).then(() => console.log(array))
    .then(() => console.log(arrayIDs))
    .then(() => startScrapingURL())
    .then(() => console.log(arrayImportance))
    .then(() => console.log(arrayStatus))
    .then(() => console.log(arrayReported))
    .then(() => console.log(arrayModified))
    .then(() => console.log(arrayDependOn))
    .then(() => console.log(arraySummary))
    .then(() => writeToJson())
    .catch(() => console.log('Failed'))
}

startScraping()
async function startScrapingURL () {
    return new Promise(async(resolve, reject) => {
            for await (const url of array) {
               await request(`https://bz.apache.org/bugzilla/${url}`, (err, response, html) => {
                    if (!err && response.statusCode === 200) {
                    const $ = cheerio.load(html)
                    const elemnt = $('#bz_show_bug_column_1').children('table').children('tbody').children('tr')
                    const elemnt1 = $('#bz_show_bug_column_2').children('table').children('tbody').children('tr')
                    $(elemnt).each((i, el) => {
                        if (i == 10) {
                            const impotrance = $(el).find('td').text().replace(/\s\s+/g, '').slice(2, -6)
                            arrayImportance.push(impotrance)
                        }
                        if ( i == 18 ) {
                            const dependesON = $(el).find('td').text().replace(/\s\s+/g, '')
                            arrayDependOn.push(dependesON)
                        } 
                    })
                    $(elemnt1).each((i, el) => {
                        if (i==0) {
                            const reported = $(el).find('td').text().substring(0, 17)
                            arrayReported.push(reported)
                        }
                        if (i == 1) {
                            const modified = $(el).find('td').text().substring(0, 17)
                            arrayModified.push(modified)
                        } 
                    })
                }  
            })
        }
            resolve() 
    })
}

let myData = []
async function writeToJson () {
    return new Promise(async(resolve, reject) => {
        let i =0
        for await (const id of arrayIDs) {
            let bug = { 
                id: arrayIDs[i],
                status: arrayStatus[i],
                summary: arraySummary[i],
                importance: arrayImportance[i], 
                dependsON: arrayDependOn[i],
                reported: arrayReported[i],
                modified: arrayModified[i] 
            }
            myData.push(bug)
            i++
        }
        let data = JSON.stringify(myData, null, 2);
            fs.appendFileSync('bugs.json', data, { flag: "wx" }, (err) => {
                if (err) throw err;
                console.log('Data written to file')
            })
    resolve() 
    })
}