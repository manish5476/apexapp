const fs = require('fs');

const layoutPath = 'd:/Apex/apexapp/src/app/(tabs)/_layout.tsx';
let content = fs.readFileSync(layoutPath, 'utf8');

// 1. Remove all Drawer.Screen lines that contain `display: 'none'`
content = content.replace(/<Drawer\.Screen[^>]*display:\s*'none'[^>]*\/>[\r\n]*/g, '');

// 2. Change name="module/index" to name="module" for all top-level drawer items.
// E.g., name="hrms/index" -> name="hrms"
// We need to be careful not to affect the main "index" which is name="index"
content = content.replace(/name="([^"]+)\/index"/g, 'name="$1"');

fs.writeFileSync(layoutPath, content);
console.log('Fixed _layout.tsx');
