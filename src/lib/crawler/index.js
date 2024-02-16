const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const url = require("url")

const SECONDARY_SCHOOLS = "secondarySchools"
const HIGH_SCHOOLS = "highSchools"

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

function extractHighSchoolDetails(data, fromUrl) {
  const $ = cheerio.load(data)

  const title = $(".field-name-schule .field-item h2").text()
  if (title === "") {
    return
  }
  const focus = $(".field-name-schule .field-item p")
    .eq(1)
    .text()
    .trim()
    .replace(/^\((.*)\)$/, "$1")
  const address = $(".field-name-schule .field-item p")
    .eq(2)
    .contents()
    .map((index, element) => {
      // Check if the node is a text node
      if (element.nodeType === 3) {
        return $(element).text().trim() // Trim whitespace
      }
    })
    .get()
    .join(" ")
  const district = $(
    '.field-name-schule .field-item p strong:contains("Bezirk")'
  )
    .parent()
    .find("a")
    .text()
  // TODO: fix the area with links instead of text
  const area = $('.field-name-schule .field-item p strong:contains("Ortsteil")')
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(1)
    .text()
    .trim()
  const schoolNumber = $(
    '.field-name-schule .field-item p strong:contains("Schulnummer")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(2)
    .text()
    .trim()

  const students = $(
    '.field-name-schule .field-item p strong:contains("Schüler")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(3)
    .text()
    .trim()
    .replace(/\/$/, "")
    .trim()

  const teachers = $(
    '.field-name-schule .field-item p strong:contains("Lehrer")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(4)
    .text()
    .trim()

  return {
    fromUrl: fromUrl,
    title: title,
    address: address,
    district: district,
    area: area,
    schoolNumber: schoolNumber,
    focus: focus,
    students: students,
    teachers: teachers,
    // languages: languages,
    // advancedCourses: advancedCourses,
    // hompage: homepage,
  }
}

function extractSecondarySchoolDetails(data, fromUrl) {
  const $ = cheerio.load(data)

  const title = $(".field-name-toptext-schule .field-item h2").text()
  if (title === "") {
    return
  }

  // first p is the address
  const address = $(".field-name-toptext-schule .field-item p")
    .first()
    .contents()
    .map((index, element) => {
      // Check if the node is a text node
      if (element.nodeType === 3) {
        return $(element).text().trim() // Trim whitespace
      }
    })
    .get()
    .join(" ")
  const district = $(
    '.field-name-toptext-schule .field-item p strong:contains("Bezirk")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(0)
    .text()
    .trim()
  const area = $(
    '.field-name-toptext-schule .field-item p strong:contains("Ortsteil")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(1)
    .text()
    .trim()
  const schoolNumber = $(
    '.field-name-toptext-schule .field-item p strong:contains("Schulnummer")'
  )
    .parent()
    .contents()
    .filter(function () {
      return this.type === "text"
    })
    .eq(2)
    .text()
    .trim()
  const focus = $(".field-name-toptext-schule-ii .field-item p")
    .text()
    .trim()
    .replace("Schwerpunkte: ", "")

  const languages = $(".field-name-field-fremdsprachen .field-item")
    .text()
    .trim()

  return {
    fromUrl: fromUrl,
    title: title,
    address: address,
    district: district,
    area: area,
    schoolNumber: schoolNumber,
    focus: focus,
    languages: languages,
  }
}

function extractLinks(fromUrl, data) {
  // extract the root path from the URL
  const parsedUrl = new URL(fromUrl)
  const rootPath = parsedUrl.origin

  // load the HTML into cheerio
  const $ = cheerio.load(data)
  const list = []

  // find all the links in the table
  $(".views-table tr").each((index, element) => {
    const link = $(element).find("td").eq(0).find("a").attr("href")
    if (link === undefined) return
    // add the link to the list
    list.push(`${rootPath}${link}`)
  })

  return list
}

async function crawl(url, type) {
  const links = await fetchHTML(url)
    .then((data) => {
      return extractLinks(url, data)
    })
    .catch((error) => {
      console.error(error.message)
    })

  // If the list is not empty, crawl the details
  const listWithDetails = []
  if (links.length > 0) {
    for (let i = 0; i < links.length; i++) {
      const details = await fetchHTML(links[i])
        .then((data) => {
          if (type === SECONDARY_SCHOOLS)
            return extractSecondarySchoolDetails(data, links[i])
          if (type === HIGH_SCHOOLS)
            return extractHighSchoolDetails(data, links[i])
        })
        .catch((error) => {
          console.error(`Failed to crawl "${url}": ${error.message}`)
        })

      if (details) listWithDetails.push(details)
      process.stdout.write(`Loading details... ${i + 1}/${links.length} \r`)
    }
  }

  return listWithDetails
}

async function crawlAllSchools() {
  const allSchools = {
    secondarySchools: [],
    highSchools: [],
    timestamp: new Date().toISOString(),
  }
  allSchools.secondarySchools = await crawl(
    "https://www.sekundarschulen-berlin.de/schulliste",
    SECONDARY_SCHOOLS
  )

  allSchools.highSchools = await crawl(
    "https://www.gymnasium-berlin.net/schulliste",
    HIGH_SCHOOLS
  )

  // Convert the JSON object to a string
  const jsonString = JSON.stringify(allSchools, null, 2)

  // Write the JSON string to a file
  fs.writeFileSync("output.json", jsonString)
}

// extractSecondarySchoolDetails(
//   "https://www.sekundarschulen-berlin.de/14-integrierte-sekundarschule"
// )

// fetchHTML("https://www.gymnasium-berlin.net/albert-einstein-gymnasium").then(
//   (data) => {
//     console.log(
//       extractHighSchoolDetails(
//         data,
//         "https://www.gymnasium-berlin.net/albert-einstein-gymnasium"
//       )
//     )
//   }
// )

crawlAllSchools()
