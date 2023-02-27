const fs = require("fs");
const path = require("path");
const common = require("./common");
const runManyOn = common.runManyOn;

const absPaths = [
  path.join(__dirname, "../node_modules/@frontegg/nextjs")
];

const paths = [
  path.join(__dirname, "../dist/@frontegg", "nextjs")

];

// removing folders
runManyOn(fs.rmSync, { recursive: true }, absPaths);
// creating folders
runManyOn(fs.mkdirSync, { recursive: true }, paths);
// linking
runManyOn(fs.symlinkSync, "dir", paths, absPaths);


