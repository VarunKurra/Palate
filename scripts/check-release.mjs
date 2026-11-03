import {checkRelease,pageRoutes} from './release-checks.mjs';
const errors=checkRelease('dist');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Release check passed: ${pageRoutes.length} routes, local assets, favicons, 404, and public-file safety.`);
