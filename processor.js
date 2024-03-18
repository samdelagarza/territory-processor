const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const math = require('mathjs');
const path = require('path');
const axios = require('axios');

const GEOCODIO_API_KEY = 'API_KEY';

// Function to geocode an address using Geocodio
async function geocodeAddress(address) {
    const url = `https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(address)}&api_key=${GEOCODIO_API_KEY}`;
    try {
        const response = await axios.get(url);
        if (response.data && response.data.results && response.data.results.length > 0) {
            return {
                latitude: response.data.results[0].location.lat,
                longitude: response.data.results[0].location.lng
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return {};
    }
}
function getFullAddress(address) {
    return `${address.HouseNumber} ${address.Street}, ${address.City}, ${address.State}, ${address.ZIPCode}`;
}
// Check for the presence of a file name argument
if (process.argv.length < 3) {
    console.log("Usage: node scriptName.js <path_to_your_csv_file>");
    process.exit(1);
}

// The first argument after the script name on the command line
const filePath = process.argv[2];

const fileName = filePath.split('/')[filePath.split('/').length-1];
const cityAndNumber = fileName.split(' ').reverse();

const territoryNumber = cityAndNumber[0].split('.csv')[0];
const city = cityAndNumber.length > 2 ? cityAndNumber[2] + " " + cityAndNumber[1] : cityAndNumber[1];
const TerritoryType = city;

// Call the function with the CLI-provided file path
processAddresses(filePath);

// Reads the CSV file, groups by street, and processes the data
function processAddresses(filePath) {
    const addresses = [];

    fs.createReadStream(filePath)
        .pipe(csv({
            mapHeaders: ({ header, index }) => header.replace(/\s+/g, '')
        }))
        .on('data', (data) => {
            addresses.push(data)
        })
        .on('end', async () => {
            // Check and geocode if necessary
            for (let i = 0; i < addresses.length; i++) {
                if (!addresses[i].Latitude || !addresses[i].Longitude) {
                    console.log(`Geocoding address for ${addresses[i].Street}...`);
                    // Construct an address string for geocoding
                    const addressString = getFullAddress(addresses[i]);

                    const geocoded = await geocodeAddress(addressString);

                    if (geocoded.latitude && geocoded.longitude) {
                        addresses[i].Latitude = geocoded.latitude;
                        addresses[i].Longitude = geocoded.longitude;
                    }

                    // Add new fields
                    addresses[i].TerritoryType = TerritoryType;
                    addresses[i].TerritoryNumber = territoryNumber;
                    addresses[i].LocationType = 'House';
                    addresses[i].Status = 'Unknown';
                    addresses[i].Address = addressString.trim();
                    addresses[i].Unit = '';
                    addresses[i].Floor = '';
                    addresses[i].County = '';

                    /*
                     Territory type	
Territory number	
Location type	
Status	
Latitude	
Longitude	
Address	Number	
Street	
Unit	
Floor	
City	
County	
Postal code	
State
                     */
                }
            }

            const groupedAddresses = addresses.reduce((acc, address) => {
                const detailedStreetName = getDetailedStreetName(address);
                if (!acc[detailedStreetName]) acc[detailedStreetName] = [];
                acc[detailedStreetName].push({
                    ...address,
                    latitude: parseFloat(address.Latitude),
                    longitude: parseFloat(address.Longitude)
                });
                return acc;
            }, {});

            const processedAddresses = [];

            Object.keys(groupedAddresses).forEach(street => {
                const latitudes = groupedAddresses[street].map(addr => addr.latitude);
                const longitudes = groupedAddresses[street].map(addr => addr.longitude);
                const latVariance = math.variance(latitudes);
                const lngVariance = math.variance(longitudes);
                const orientation = determineOrientation(latVariance, lngVariance);

                groupedAddresses[street].forEach(addr => {
                    processedAddresses.push({
                        ...addr,
                        orientation
                    });
                });
            });

            // Sorting logic
            processedAddresses.sort((a, b) => {
                if (a.orientation === b.orientation) {
                    if (a.orientation === 'East-West') {
                        if (getDetailedStreetName(a) === getDetailedStreetName(b)) {
                            return a.latitude - b.latitude;
                        }
                        return b.latitude - a.latitude;
                    } else {
                        if (getDetailedStreetName(a) === getDetailedStreetName(b)) {
                            return a.longitude - b.longitude;
                        }
                        return b.longitude - a.longitude;
                    }
                }
                return a.orientation.localeCompare(b.orientation);
            });

            // Constructing the output file name
            const outputFilePath = path.join(
                path.dirname(filePath),
                `${path.basename(filePath, '.csv')}-sorted.csv`
            );

            // Writing to CSV
            const csvWriter = createCsvWriter({
                path: outputFilePath,
                header: [
                    { id: 'TerritoryType', title: 'Territory Type' },
                    { id: 'TerritoryNumber', title: 'Territory Number' },
                    { id: 'LocationType', title: 'Location Type' },
                    { id: 'Status', title: 'Status' },
                    { id: 'Latitude', title: 'Latitude' },
                    { id: 'Longitude', title: 'Longitude' },

                    { id: 'Address', title: 'Address' },
                    { id: 'HouseNumber', title: 'Number' },
                    { id: 'Street', title: 'Street' },
                    { id: 'City', title: 'City' },
                    { id: 'County', title: 'County' },
                    { id: 'State', title: 'State' },
                    { id: 'ZIPCode', title: 'ZIP Code' },

                    // { id: 'PreDirectional', title: 'Pre-directional' },
                    // { id: 'StreetSuffix', title: 'Street Suffix' },
                    // { id: 'PostDirectional', title: 'Post-directional' },
                    // { id: 'ApartmentNumber', title: 'Apartment Number' },
                    // { id: 'City', title: 'City' },
                    // { id: 'State', title: 'State' },
                    // { id: 'ZIPCode', title: 'ZIP Code' },

                    { id: 'LastName', title: 'Last Name' },
                    { id: 'FirstName', title: 'First Name' },
                    { id: 'CountyName', title: 'County Name' },
                    { id: 'PhoneNumber', title: 'Phone Number' },
                    { id: 'orientation', title: 'Orientation' }
                ]
            });

            /*
            Territory type	
            Territory number	
            Location type	
            Status	
            Latitude	
            Longitude	
            Address	Number	
            Street	
            Unit	
            Floor	
            City	
            County	
            Postal code	
            State
            */

            csvWriter
                .writeRecords(processedAddresses)
                .then(() => console.log('The CSV file was written successfully'));
        });
}


// Helper function to determine road orientation
function determineOrientation(latVariance, lngVariance) {
    return latVariance > lngVariance ? 'North-South' : 'East-West';
}

// Helper function to construct a detailed street name
function getDetailedStreetName({ PreDirectional, Street, StreetSuffix, PostDirectional }) {
    return `${PreDirectional || ''} ${Street} ${StreetSuffix || ''} ${PostDirectional || ''}`.trim();
}




