import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), './package.json')));
const nodeModulesPath = path.join(__dirname, '../../node_modules', pkg.name);

export default function movePackageJsonPlugin(distFolder) {
    return {
      name: 'move-package-json',
      buildEnd() {
        let enhancedPkg = pkg;
        enhancedPkg.main = enhancedPkg.main.replace('dist/', '');
        if (enhancedPkg.module) {
          enhancedPkg.module = enhancedPkg.module.replace('dist/', '');
        }
        enhancedPkg.types = enhancedPkg.types.replace('dist/', '');
        fs.mkdirSync(distFolder, { recursive: true });
        fs.writeFileSync(path.join(distFolder, 'package.json'), JSON.stringify(enhancedPkg, null, 2), {
          encoding: 'utf8',
        });
        fs.rmSync(nodeModulesPath, { recursive: true });
        fs.symlinkSync(distFolder, nodeModulesPath, 'dir');
      },
    };
  }