const fs = require("fs");
const path = require("path");
const { createICO, createICNS } = require("png2icons");

// Input and output paths
const inputPath = "./src/assets/images/logo.png";
const icoOutputPath = "./src/assets/images/logo.ico";
const icnsOutputPath = "./src/assets/images/logo.icns";

// Read the PNG file
const input = fs.readFileSync(path.resolve(inputPath));

// Convert PNG to ICO for Windows
const icoOutput = createICO(input, 0, false, true); // -icowe for Windows executable compatibility
fs.writeFileSync(path.resolve(icoOutputPath), icoOutput);
console.log(`ICO file created at ${icoOutputPath}`);

// Convert PNG to ICNS for macOS
const icnsOutput = createICNS(input, 0, false); // Bicubic interpolation, no color reduction
fs.writeFileSync(path.resolve(icnsOutputPath), icnsOutput);
console.log(`ICNS file created at ${icnsOutputPath}`);
