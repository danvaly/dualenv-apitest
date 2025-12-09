const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = path.join(__dirname, '..', 'build');
const iconsDir = path.join(buildDir, 'icons');
const svgPath = path.join(buildDir, 'icon.svg');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes for different platforms
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

async function generateIcons() {
  console.log('Generating icons from SVG...');

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate PNG icons for Linux (in icons folder)
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  // Generate main icon.png for electron-builder (512x512)
  const mainIconPath = path.join(buildDir, 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log(`Generated ${mainIconPath}`);

  // Generate icns for Mac
  if (process.platform === 'darwin') {
    console.log('Generating icns for Mac...');
    const iconsetDir = path.join(buildDir, 'icon.iconset');

    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir);
    }

    // Mac iconset requires specific sizes
    const macSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' },
    ];

    for (const { size, name } of macSizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsetDir, name));
    }

    // Convert iconset to icns
    try {
      execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
      console.log('Generated icon.icns');

      // Clean up iconset
      fs.rmSync(iconsetDir, { recursive: true });
    } catch (error) {
      console.error('Failed to generate icns:', error.message);
    }
  }

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
