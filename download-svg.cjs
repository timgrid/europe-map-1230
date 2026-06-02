const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://upload.wikimedia.org/wikipedia/commons/6/6a/1230_CE%2C_Europe.svg';
const outputPath = path.join(__dirname, 'public', 'europe-1230.svg');

// Ensure public directory exists
if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'));
}

const file = fs.createWriteStream(outputPath);
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('SVG downloaded successfully');
    console.log('File size:', fs.statSync(outputPath).size, 'bytes');
  });
}).on('error', (err) => {
  console.error('Download error:', err.message);
});
