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
const arrayComponents = []
const arrayAge = []
const arrayRelatedBugs = []
const arrayCCList = []

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
    })
    .then(() => console.log(array))
    .then(() => console.log(arrayIDs))
    .then(() => startScrapingURL())
    .then(() => console.log(arrayImportance))
    .then(() => console.log(arrayStatus))
    .then(() => console.log(arrayReported))
    .then(() => console.log(arrayModified))
    .then(() => console.log(arrayDependOn))
    .then(() => console.log(arraySummary))
    .then(() => calculateAge())
    .then(() => getRelatedBugs())
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
                    const component = $('#field_container_component').text()

                    // Adding component name to array
                    componentText = component.split(' ')[0].replace(/\s+/g, '')
                    arrayComponents.push(componentText)
                    
                    $(elemnt).each((i, el) => {
                        if (i == 10) {
                            const impotrance = $(el).find('td').text().replace(/\s\s+/g, '').slice(2, -6)
                            arrayImportance.push(impotrance)
                        }
                        if (i == 18) {
                            const dependesON = $(el).find('td').text().replace(/\s\s+/g, '')
                            arrayDependOn.push(dependesON)
                        } 
                    })

                    $(elemnt1).each((i, el) => {
                        if (i == 0) {
                            const reported = $(el).find('td').text().substring(0, 17)
                            arrayReported.push(reported)
                        }
                        if (i == 1) {
                            const modified = $(el).find('td').text().substring(0, 17)
                            arrayModified.push(modified)
                        } 
                        if (i == 2) {
                            const ccList = $(el).find('td').text().substring(0, 1)
                            arrayCCList.push(ccList)
                        } 
                    })
                }  
            })
        }
        resolve() 
    })
}


async function calculateAge() {
    console.log("Printing out ArrayIDs:")
    let i = 0
    arrayIDs.forEach(element => {
        let reportedTime = arrayReported[i]
        let modifiedTime = arrayModified[i]

        let reportedDate = new Date(reportedTime)
        let modifiedDate = new Date(modifiedTime)
        let ageDifMs = modifiedDate.getTime() - reportedDate.getTime()
        let ageDate = new Date(ageDifMs) // miliseconds from epoch
        let years = Math.abs(ageDate.getUTCFullYear() - 1970)
        let months = Math.abs(ageDate.getUTCMonth())
        let days = Math.abs(ageDate.getUTCDate() - 1)
        let hours = Math.abs(ageDate.getUTCHours())
        let minutes = Math.abs(ageDate.getUTCMinutes())

        let age = {
            years: years,
            months: months,
            days: days,
            hours: hours,
            minutes: minutes
        }

        arrayAge.push(age)
        i++
    });
}

async function getRelatedBugs() {
    return new Promise(async(resolve, reject) => {
        
        arrayComponents.forEach(element => {
            console.log(element)
        })

        for await (const component of arrayComponents) {
            const bugsSet = []
            await request(`https://bz.apache.org/bugzilla/buglist.cgi?component=${component}&product=Tomcat%2010&bug_status=__open__`, (err, response, html) => {
                if (!err && response.statusCode === 200) {
                    const $ = cheerio.load(html)

                    const bugs = $('.bz_buglist').children('tbody').children('tr')
                    $(bugs).each(function(i, el) {
                        if (i == 1) {
                            const bugList = $(el).find('a').first().text().replace(/\s\s+/g, '')
                            bugsSet.push(bugList)
                        }
                        if(i==2) {
                            const bugList = $(el).find('a').first().text().replace(/\s\s+/g, '')
                            bugsSet.push(bugList)
                        }
                    });

                    // console.log(`Component: ${component}    Bug: ${bug}`)
                    // bugsSet.add(bugs)

                    // Exclude the parent ID, just child IDs

                }
            })
            arrayRelatedBugs.push(bugsSet)
        }
       
        resolve()
    })
}

async function writeToJson () {
    let myData = []
    
    return new Promise(async(resolve, reject) => {
        let i = 0
        for await (const id of arrayIDs) {
            let bug = { 
                id: arrayIDs[i],
                status: arrayStatus[i],
                summary: arraySummary[i],
                importance: arrayImportance[i], 
                dependsON: arrayDependOn[i],
                reported: arrayReported[i],
                modified: arrayModified[i],
                age: arrayAge[i],
                component: arrayComponents[i],
                relatedBugs: arrayRelatedBugs[i],
                ccList: arrayCCList[i]
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