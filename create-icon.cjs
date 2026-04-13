const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertPngToIco(pngPath, icoPath) {
  try {
    // eslint-disable-next-line no-console
    console.log('Converting PNG to ICO...');
    // eslint-disable-next-line no-console
    console.log('Source:', pngPath);
    // eslint-disable-next-line no-console
    console.log('Target:', icoPath);

    // Ensure icons directory exists
    const iconsDir = path.dirname(icoPath);
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Use sharp to create proper ICO with multiple sizes
    await sharp(pngPath)
      .resize(256, 256)
      .toFormat('png')
      .toFile(icoPath.replace('.ico', '.png'));

    // For ICO format, we need to use a different approach
    // Convert PNG to ICO using sharp's raw output
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const pngBuffer = await sharp(pngPath).toBuffer();

    // Create ICO file with proper header
    // ICO files can contain PNG data directly (Vista+)
    const sizes = [256, 128, 64, 48, 32, 16];
    const images = [];

    for (const size of sizes) {
      const resized = await sharp(pngPath).resize(size, size).png().toBuffer();
      images.push({ size, buffer: resized });
    }

    // Build ICO file
    const headerSize = 6;
    const entrySize = 16;
    const numImages = images.length;
    const dataOffset = headerSize + entrySize * numImages;

    // Header
    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = icon)
    header.writeUInt16LE(numImages, 4); // Number of images

    // Directory entries and image data
    const entries = [];
    const imageData = [];
    let offset = dataOffset;

    for (const img of images) {
      const entry = Buffer.alloc(entrySize);
      entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width
      entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(img.buffer.length, 8); // Image size
      entry.writeUInt32LE(offset, 12); // Image offset

      entries.push(entry);
      imageData.push(img.buffer);
      offset += img.buffer.length;
    }

    // Combine all parts
    const icoBuffer = Buffer.concat([header, ...entries, ...imageData]);

    // Write ICO file
    fs.writeFileSync(icoPath, icoBuffer);
    // eslint-disable-next-line no-console
    console.log('✓ ICO file created successfully!');
    // eslint-disable-next-line no-console
    console.log('  Path:', icoPath);
    // eslint-disable-next-line no-console
    console.log('  Size:', icoBuffer.length, 'bytes');
    // eslint-disable-next-line no-console
    console.log('  Images:', numImages, 'sizes (', sizes.join('x'), ')');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('✗ Error creating ICO:', error.message);
    // eslint-disable-next-line no-console
    console.error(error.stack);
    process.exit(1);
  }
}

const pngPath = path.join(__dirname, 'public', 'proclaw-logo.png');
const icoPath = path.join(__dirname, 'src-tauri', 'icons', 'icon.ico');

convertPngToIco(pngPath, icoPath);
