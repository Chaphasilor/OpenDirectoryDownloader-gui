const fs = require(`fs`);
const { createGzip } = require('zlib');
const pipe = require(`util`).promisify(require(`stream`).pipeline);
const fetch = require(`node-fetch`);
const FormData = require(`form-data`);

module.exports.uploadScan = async function uploadScan(scanPath) {

  console.log(`Compressing file before upload...`)
  let fileToUpload
  try {
    fileToUpload = await compressFile(scanPath) // compresses without deleting the original
  } catch (err) {

    console.warn(`Couldn't compress file '${scanPath}':`, err)
    fileToUpload = scanPath // try to upload uncompressed file

  }

  console.log(`Uploading scan...`)
  
  const form = new FormData();
  form.append(`file`, fs.createReadStream(fileToUpload))
  
  let res = await fetch(`${process.env.ODCRAWLER_DISCOVERY_ENDPOINT}/upload`, {
    method: `POST`,
    headers: {
      Authorization: 'Basic ' + Buffer.from(process.env.ODCRAWLER_DISCOVERY_UPLOAD_USERNAME + ":" + process.env.ODCRAWLER_DISCOVERY_UPLOAD_PASSWORD).toString('base64'),
    },
    body: form,
    timeout: 0,
    compress: true,
  });

  let jsonResponse;
  try {
    jsonResponse = await res.json();
  } catch (err) {
    throw new Error(`Failed to upload scan to discovery server: ${err}`);
  }

  if (res.ok && jsonResponse.ok) {
    console.info(`Scan uploaded successfully! Path: ${jsonResponse.path}`);
    fs.unlinkSync(fileToUpload)
  } else {
    throw new Error(`Failed to upload scan: ${jsonResponse.error}`)
  }

}

/**
 * Compresses a file using gzip
 * @param {String} input The path to the input file
 * @param {String} [output] The path to the output file. Can't exist yet.
 * @returns {String} The path to the output file
 */
async function compressFile(input, output) {
  
  const outputName = output || `${input}.gz`;
  const gzip = createGzip();
  const source = fs.createReadStream(input);
  const destination = fs.createWriteStream(outputName);
  await pipe(source, gzip, destination);

  return outputName
  
}