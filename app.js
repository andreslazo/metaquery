require('dotenv').config()
const { pool, queryDatabase } = require('./connector')

const fs = require('fs')
const debug = require('debug')('.')

function jsonToCsv(items) {
  const header = Object.keys(items[0])

  const headerString = header.join(';')

  // handle null or undefined values here
  const replacer = (key, value) => value ?? ''

  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(';')
  )

  // join header and body, and break into separate lines
  const csv = [headerString, ...rowItems].join('\r\n')

  return csv
}

const DBNAME_FILTER_REGEX = new RegExp(process.env.DBNAME_FILTER_REGEX)

async function startApp () {
  console.time('Execution time')

  try {
    debug('METAQUERY STARTS ****\n')

    let databases =
      process.env.DATABASE_LIST ? process.env.DATABASE_LIST.split(',') : []

    if (databases.length == 0) {
      const [results] = await pool.query('SHOW databases')

      databases = results
        .map(result => result['Database'])
        .filter(dbName => DBNAME_FILTER_REGEX.test(dbName))
    }

    const total = databases.length
    let done = 0

    // Run every tenant in parallel; the pool's connectionLimit (= CONCURRENCY)
    // throttles how many execute at once. Progress is logged as each tenant
    // settles (completion order, not list order, since they run concurrently).
    const settled = await Promise.allSettled(
      databases.map(database =>
        queryDatabase(database, process.env.SQL_STATEMENT)
          .then(
            rows => {
              const rowCount = rows?.length ?? 0
              const progress = parseInt(++done / total * 100)
              debug(`[${done}/${total} ${progress}%] ${database} -> ${rowCount} rows`)
              return rows
            },
            error => {
              const progress = parseInt(++done / total * 100)
              debug(`[${done}/${total} ${progress}%] ${database} -> ERROR: ${error.message}`)
              throw error
            }
          )
      )
    )

    const allMyResults = []
    settled.forEach((outcome) => {
      if (outcome.status === 'fulfilled' && outcome.value?.length > 0) {
        allMyResults.push(outcome.value)
      }
    })

    debug('*** METAQUERY FINISHES\n')

    debug('Databases affected size: ', allMyResults.length)

    if (allMyResults.length == 0) {
      debug("RESULTS: no data :(\n")
    } else {
      const csv = jsonToCsv(allMyResults.flat(1))

      fs.writeFileSync('results.csv', csv)
      console.log('RESULTS: results.csv created!\n')
    }
  } finally {
    await pool.end()
  }

  console.timeEnd('Execution time')
}

module.exports = {
  startApp
}
