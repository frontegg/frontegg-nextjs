const fs = require('fs');
const path = require('path');
const {version} = require(path.join(__dirname, '../packages/nextjs/package.json'))

fs.writeFileSync(path.join(__dirname, '../packages/nextjs/src/sdkVersion.ts'), `export default { version: '${version}' };\n`, {encoding: 'utf-8'})
