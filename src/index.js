#!/usr/bin/env node

import { ImagePool } from '@squoosh/lib';
import fs from 'fs-extra';
import path from 'node:path';
import prompts from 'prompts';
import chalk from 'chalk';
import { cpus } from 'os';

async function getUserInput() {
  const questions = [
    {
      type: 'text',
      name: 'inputPath',
      message: 'Enter the path to the images folder:',
      initial: './',
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
      min: 0,
      hint: '- Use space to select, Enter to confirm'
    }
  ];

  return await prompts(questions);
}

function addEncodeAndWriteTask(format, options, image, encodeTasks, writeTasks, outputDir, fileName, ext) {
  encodeTasks.push(image.encode({ [format]: options }));
  writeTasks.push({
    format,
    outputFile: path.join(outputDir, `${fileName}.${ext}`),
  });
}

async function processImage(imagePool, inputFile, outputDir, quality, formats) {
  const fileName = path.basename(inputFile, path.extname(inputFile));
  const originalExt = path.extname(inputFile).toLowerCase().slice(1);
  const image = imagePool.ingestImage(inputFile);

  await image.preprocess({});

  const encodeTasks = [];
  const writeTasks = [];

  if (originalExt === 'jpg' || originalExt === 'jpeg') {
    addEncodeAndWriteTask('mozjpeg', { quality }, image, encodeTasks, writeTasks, outputDir, fileName, originalExt);
  } else if (originalExt === 'png') {
    addEncodeAndWriteTask('oxipng', { level: Math.round((1 - quality / 100) * 6) }, image, encodeTasks, writeTasks, outputDir, fileName, originalExt);
  }

  if (formats.includes('webp')) {
    addEncodeAndWriteTask('webp', { quality, method: 4 }, image, encodeTasks, writeTasks, outputDir, fileName, 'webp');
  }

  if (formats.includes('avif')) {
    addEncodeAndWriteTask('avif', { quality, speed: 6 }, image, encodeTasks, writeTasks, outputDir, fileName, 'avif');
  }

  await Promise.all(encodeTasks);

  for (const { format, outputFile } of writeTasks) {
    const encoded = await image.encodedWith[format];
    await fs.writeFile(outputFile, encoded.binary);
    console.log(chalk.green(`Processed: ${outputFile}`));
  }
}

async function processImages() {
  const { inputPath, quality, formats } = await getUserInput();

  if (!inputPath || quality === undefined || formats === undefined) {
    console.log(chalk.yellow('Process canceled by user or invalid input provided.'));
    return;
  }

  try {
    const outputDir = path.join(inputPath, 'converted');

    if (await fs.pathExists(outputDir)) {
      await fs.remove(outputDir);
    }

    await fs.ensureDir(outputDir);

    const files = await fs.readdir(inputPath);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    if (imageFiles.length === 0) {
      console.log(chalk.yellow('No images (jpg, jpeg, png) found in the folder.'));
      return;
    }

    console.log(chalk.blue(`Found ${imageFiles.length} images to process...`));

    const imagePool = new ImagePool(cpus().length - 1);

    const processPromises = imageFiles.map((file) =>
      processImage(imagePool, path.join(inputPath, file), outputDir, quality, formats)
    );

    await Promise.all(processPromises);
    await imagePool.close();
    console.log(chalk.blue('Processing completed!'));
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
  }
}

processImages();
