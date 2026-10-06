// Let the Playwright runner own browser fixtures and worker shutdown.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(process.execPath, [resolve(root,'node_modules/@playwright/test/cli.js'), 'test', '--config', 'scripts/playwright-survivor-fullrun.config.mjs'], {cwd:root,stdio:'inherit'});
const code = await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>resolve(code??1));});
if (code !== 0) process.exitCode = code;
else {
  const output=resolve(root,'output/playwright/survivor/fullrun');
  const results=await Promise.all(['ash','ember','grove'].map(async id=>JSON.parse(await readFile(`${output}/${id}.json`,'utf8'))));
  await writeFile(`${output}/summary.json`,JSON.stringify(results,null,2)+'\n');
}
