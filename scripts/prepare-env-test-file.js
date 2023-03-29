const path = require("path");
const fs = require("fs");
const { v4 } = require("uuid");
const crypto = require("crypto");

const envFilePath = path.join(__dirname, "../packages/nextjs/.env");


const testHost = "https://test.frontegg.com";
const randomClientId = v4();
const randomEncryptionPassword = crypto.randomBytes(32).toString("hex");

const envVariables = {
  FRONTEGG_APP_URL: "http://localhost:3000",
  FRONTEGG_BASE_URL: testHost,
  FRONTEGG_CLIENT_ID: randomClientId,
  FRONTEGG_ENCRYPTION_PASSWORD: randomEncryptionPassword,
  FRONTEGG_COOKIE_NAME: "fe_session",
  FRONTEGG_LOG_LEVEL: "debug"
};

const fileContent = Object.keys(envVariables).map(key => `${key}=${envVariables[key]}`).join('\n') + '\n';

fs.writeFileSync(envFilePath, fileContent, {encoding:"utf-8"})
