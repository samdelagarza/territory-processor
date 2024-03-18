const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');
const XLSX = require('xlsx');

// Define the directory containing CSV files
const directoryPath = './data/Frisco';

// Read all files in the directory
fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    // Filter out only CSV files
    const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv');

    // Process each CSV file
    csvFiles.forEach(csvFile => {
        const csvFilePath = path.join(directoryPath, csvFile);

        // Convert CSV to JSON
        csv()
            .fromFile(csvFilePath)
            .then((jsonObj) => {
                // Create a new workbook
                const wb = XLSX.utils.book_new();

                // Convert JSON to worksheet
                const ws = XLSX.utils.json_to_sheet(jsonObj);

                // Add worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

                // Write workbook to file
                const xlsxFilePath = path.join(directoryPath, path.basename(csvFile, '.csv') + '.xlsx');
                XLSX.writeFile(wb, xlsxFilePath);

                console.log(`${csvFile} converted to ${path.basename(xlsxFilePath)}`);
            })
            .catch((err) => {
                console.error(`Error converting ${csvFile}:`, err);
            });
    });
});
