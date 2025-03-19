#!/usr/bin/env node

import { ImagePool } from '@squoosh/lib';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';

async function getUserInput() {
  const questions = [
    {
      type: 'text',
      name: 'inputPath',
      message: 'Enter the path to the images folder:',
      initial: './images',
      validate: value => fs.existsSync(value) ? true : 'Folder does not exist'
    },
    {
      type: 'number',
      name: 'quality',
      message: 'Enter compression quality (0-100):',
      initial: 80,
      validate: value => value >= 0 && value <= 100 ? true : 'Quality must be a number between 0 and 100'
    },
    {
      type: 'multiselect',
      name: 'formats',
      message: 'Select required formats (space to choose):',
      choices: [
        { title: 'webp', value: 'webp' },
        { title: 'avif', value: 'avif' }
      ],
      initial: [0],
      min: 1,
      hint: '- Use space to select, Enter to confirm'
    }
  ];

  return await prompts(questions);
}

async function processImages() {
  const { inputPath, quality, formats } = await getUserInput();

  if (!inputPath || quality === undefined || !formats) {
    console.log(chalk.yellow('Process canceled by user or invalid input provided.'));
    return;
  }

  try {
    const outputDir = path.join(inputPath, 'converted');
    await fs.ensureDir(outputDir);

    const files = await fs.readdir(inputPath);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    if (imageFiles.length === 0) {
      console.log(chalk.yellow('No images (jpg, jpeg, png) found in the folder.'));
      return;
    }

    console.log(chalk.blue(`Found ${imageFiles.length} images to process...`));

    const imagePool = new ImagePool();

    for (const file of imageFiles) {
      const inputFile = path.join(inputPath, file);
      const fileName = path.basename(file, path.extname(file));
      const originalExt = path.extname(file).toLowerCase().slice(1);
      const image = imagePool.ingestImage(inputFile);
      const originalOutputFile = path.join(outputDir, `${fileName}.${originalExt}`);

      if (originalExt === 'jpg' || originalExt === 'jpeg') {
        await image.encode({ mozjpeg: { quality } });
        const encodedJpeg = await image.encodedWith.mozjpeg;
        await fs.writeFile(originalOutputFile, encodedJpeg.binary);
        console.log(chalk.green(`Compressed to original format: ${originalOutputFile}`));
      } else if (originalExt === 'png') {
        await image.encode({ oxipng: { level: Math.round((1 - quality / 100) * 6) } });
        const encodedPng = await image.encodedWith.oxipng;
        await fs.writeFile(originalOutputFile, encodedPng.binary);
        console.log(chalk.green(`Compressed to original format: ${originalOutputFile}`));
      }

      if (formats.includes('webp')) {
        const webpOutputFile = path.join(outputDir, `${fileName}.webp`);
        await image.encode({ webp: { quality } });
        const encodedWebp = await image.encodedWith.webp;
        await fs.writeFile(webpOutputFile, encodedWebp.binary);
        console.log(chalk.green(`Converted to: ${webpOutputFile}`));
      }

      if (formats.includes('avif')) {
        const avifOutputFile = path.join(outputDir, `${fileName}.avif`);
        await image.encode({ avif: { quality } });
        const encodedAvif = await image.encodedWith.avif;
        await fs.writeFile(avifOutputFile, encodedAvif.binary);
        console.log(chalk.green(`Converted to: ${avifOutputFile}`));
      }
    }

    await imagePool.close();
    console.log(chalk.blue('Processing completed!'));
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
  }
}

processImages();
