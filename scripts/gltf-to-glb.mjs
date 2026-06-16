import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;

function padTo4(value) {
  return (4 - (value % 4)) % 4;
}

function decodeDataUri(uri) {
  const match = uri.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    return null;
  }

  return match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]));
}

async function readBuffer(uri, sourceDir) {
  const decoded = decodeDataUri(uri);
  if (decoded) {
    return decoded;
  }

  return readFile(path.resolve(sourceDir, uri));
}

async function convertGltfToGlb(inputPath, outputPath) {
  const sourceDir = path.dirname(inputPath);
  const gltf = JSON.parse(await readFile(inputPath, 'utf8'));
  const buffers = gltf.buffers ?? [];

  if (buffers.length === 0) {
    throw new Error(`${inputPath} does not contain buffers.`);
  }

  const bufferChunks = [];
  let combinedByteLength = 0;

  for (let index = 0; index < buffers.length; index += 1) {
    const buffer = buffers[index];

    if (!buffer.uri) {
      throw new Error(`${inputPath} contains an unsupported buffer without a uri.`);
    }

    const bytes = await readBuffer(buffer.uri, sourceDir);
    const offset = combinedByteLength;
    const padding = padTo4(bytes.length);

    bufferChunks.push(bytes, Buffer.alloc(padding));
    combinedByteLength += bytes.length + padding;

    for (const bufferView of gltf.bufferViews ?? []) {
      if ((bufferView.buffer ?? 0) === index) {
        bufferView.buffer = 0;
        bufferView.byteOffset = (bufferView.byteOffset ?? 0) + offset;
      }
    }
  }

  const binaryChunk = Buffer.concat(bufferChunks, combinedByteLength);
  gltf.buffers = [{ byteLength: binaryChunk.length }];

  const jsonBytes = Buffer.from(JSON.stringify(gltf));
  const jsonPadding = padTo4(jsonBytes.length);
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);

  const totalLength = 12 + 8 + jsonChunk.length + 8 + binaryChunk.length;
  const output = Buffer.alloc(totalLength);
  let cursor = 0;

  output.writeUInt32LE(GLB_MAGIC, cursor);
  cursor += 4;
  output.writeUInt32LE(GLB_VERSION, cursor);
  cursor += 4;
  output.writeUInt32LE(totalLength, cursor);
  cursor += 4;
  output.writeUInt32LE(jsonChunk.length, cursor);
  cursor += 4;
  output.writeUInt32LE(JSON_CHUNK_TYPE, cursor);
  cursor += 4;
  jsonChunk.copy(output, cursor);
  cursor += jsonChunk.length;
  output.writeUInt32LE(binaryChunk.length, cursor);
  cursor += 4;
  output.writeUInt32LE(BIN_CHUNK_TYPE, cursor);
  cursor += 4;
  binaryChunk.copy(output, cursor);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);
  return { inputPath, outputPath, bytes: output.length };
}

const args = process.argv.slice(2);
let outDir = null;
const inputs = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--out-dir') {
    outDir = path.resolve(args[index + 1]);
    index += 1;
  } else {
    inputs.push(args[index]);
  }
}

if (inputs.length === 0) {
  console.error('Usage: node scripts/gltf-to-glb.mjs [--out-dir public/models] source/player-wizard.gltf ...');
  process.exit(1);
}

for (const input of inputs) {
  const inputPath = path.resolve(input);
  const outputName = path.basename(inputPath).replace(/\.gltf$/i, '.glb');
  const outputPath = outDir ? path.join(outDir, outputName) : inputPath.replace(/\.gltf$/i, '.glb');
  const result = await convertGltfToGlb(inputPath, outputPath);
  console.log(`${path.relative(process.cwd(), result.inputPath)} -> ${path.relative(process.cwd(), result.outputPath)} (${Math.round(result.bytes / 1024)} KB)`);
}
