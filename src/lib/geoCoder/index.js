const axios = require("axios")
const fs = require("fs")

function fetchGeoCode(address) {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_SCHOOLS_GOOGLE_MAPS_API_KEY}`
      )
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

// async function geoCode(address) {
//   try {
//     return await geocoder.geocode(address)
//   } catch (error) {
//     console.error("Failed to geocode address: ", error.message)
//   }
// }

async function enhanceSchoolsWithGeoData(schools) {
  schools = schools || []

  for (let i = 0; i < schools?.length || 0; i++) {
    const school = schools[i]
    // const geoData = await geoCode(school.address)
    const geoData = await fetchGeoCode(school.address).catch((error) => {
      console.error(error.message)
      return null
    })
    if (geoData && geoData?.status === "OK") {
      school.geoData = geoData?.results[0]
    }
  }

  return schools
}

async function geoCodeAllSchools() {
  // retrieve all schools from the output.json
  const allSchools = require("../../../output.json")

  // get all secondary schools
  const secondarySchools = allSchools?.secondarySchools || []
  // enhance secondary schools with geoData
  // allSchools.secondarySchools = await enhanceSchoolsWithGeoData(secondarySchools)

  const test = await enhanceSchoolsWithGeoData([secondarySchools[0]])
  // console.log(">>>>>>>>>test", test)

  // get all high schools
  const highSchools = allSchools?.highSchools || []

  // Convert the JSON object to a string
  const jsonString = JSON.stringify(test, null, 2)

  // Write the JSON string to a file
  fs.writeFileSync("output_geocode.json", jsonString)

  return test
}

// geoCode("29 champs elysée paris")
geoCodeAllSchools()

/*
  // fetch geocode for each address with a delay and wait until the last one is done
  const promises = schools.secondarySchools.slice(0, 2).map(async (school) => {
    // fetch and wait for the geoCode
    // const res = geoCode(school.address)
    const res = await fetchGeoCode(school.address).catch((error) => {
      console.error(error.message)
      return null
    })

    console.log(">>>>>>>>>>>>>>>>", res)

    // save the schoolNumber with the geoCode in allSchools
    if (res) {
      allSchools.secondarySchools.push({
        schoolNumber: school.schoolNumber,
        address: school.address,
        geoData: res,
      })
    }

    // Delay for 1 second before making the next request
    // await new Promise((resolve) => setTimeout(resolve, 1000))
  })

  // Wait for all promises to resolve
  await Promise.all(promises)

  console.log("promises:::::", promises)

*/
