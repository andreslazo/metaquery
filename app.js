require('dotenv').config()
const { useConn, exec } = require('./connector')

var fs = require('fs')
const debug = require('debug')('.')

function jsonToCsv(items) {
  const header = Object.keys(items[0])

  const headerString = header.join(',')

  // handle null or undefined values here
  const replacer = (key, value) => value ?? ''

  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(',')
  )

  // join header and body, and break into separate lines
  const csv = [headerString, ...rowItems].join('\r\n')

  return csv
}

const DBNAME_FILTER_REGEX = new RegExp(process.env.DBNAME_FILTER_REGEX)

async function startApp () {
  console.time('Execution time')

  await useConn(async function (dbConn) {
    debug('METAQUERY STARTS ****\n')

    let databases =
      process.env.DATABASE_LIST ? process.env.DATABASE_LIST.split(',') : []

    if (databases.length == 0) {
      const results = await exec(dbConn, 'SHOW databases')

      databases = results
        .map(result => result['Database'])
        .filter(dbName => DBNAME_FILTER_REGEX.test(dbName))
    }

    const allMyResults = []
    for ([index, database] of databases.entries()) {
      debug(`USING ${database} ...`)

      try {
        await exec(dbConn, `USE ${database}`)

        const myresult =
          await exec(dbConn, process.env.SQL_STATEMENT)
        const jsonResult = JSON.parse(JSON.stringify(myresult))

        if (myresult.length > 0) allMyResults.push(jsonResult)
      } catch (error) {
        debug(`Error executing query on ${database}: ${error.message}`)
      }

      const progress = parseInt((index + 1) / databases.length * 100)
      debug(`progress ----------------------------> ${progress}%`)
    }

    debug('*** METAQUERY FINISHES\n')

    debug('Databases affected size: ', allMyResults.length)

    if (allMyResults.length == 0) {
      debug("RESULTS: no data :(\n")
    } else {
      const csv = jsonToCsv(allMyResults.flat(1))

      fs.appendFile('results.csv', csv, function (err) {
        if (err) throw err
        console.log('RESULTS: results.csv created!\n')
      })
    }
  })

  console.timeEnd('Execution time')
}

module.exports = {
  startApp
}
