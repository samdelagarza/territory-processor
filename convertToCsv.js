const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

function convertXlsxToCsv(sourceFilePath, outputFolderPath) {
    const workbook = xlsx.readFile(sourceFilePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const csvContent = xlsx.utils.sheet_to_csv(worksheet);
    const sourceFileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
    const outputFilePath = path.join(outputFolderPath, `${sourceFileName}.csv`);
    fs.writeFileSync(outputFilePath, csvContent, 'utf8');
    console.log(`Converted XLSX to CSV: ${outputFilePath}`);
}

function convertFolderXlsxToCsv(folderPath, outputFolderPath = folderPath) {
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error("Could not list the directory.", err);
            process.exit(1);
        }

        files.forEach(file => {
            const fullFilePath = path.join(folderPath, file);
            if (path.extname(file).toLowerCase() === '.xlsx') {
                convertXlsxToCsv(fullFilePath, outputFolderPath);
            }
        });
    });
}

// Example usage
// const folderPath = 'data/Frisco';
const folderPath = 'data/Little\ Elm';
const dataFolderPath = path.join(__dirname, folderPath);
console.log('path: ', dataFolderPath)
convertFolderXlsxToCsv(folderPath);