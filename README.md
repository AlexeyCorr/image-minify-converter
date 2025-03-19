# Image Minify Converter

A command-line tool for compressing and converting images to WebP and AVIF formats.

## Installation

```bash
npm install -g image-minify-converter
```

## Usage

```bash
image-minify
```

- Enter the path to the folder containing your images.
- Specify compression quality (0-100).
- Select output formats (WebP, AVIF).
- Press Enter to start the conversion process.

Supported input formats: JPG, JPEG, PNG.

Output files are saved in a converted subfolder within the input directory.

## Requirements

Node.js 16.x

## Dependencies

- [@squoosh/lib](https://www.npmjs.com/package/@squoosh/lib)
- [chalk](https://www.npmjs.com/package/chalk)
- [fs-extra](https://www.npmjs.com/package/fs-extra)
- [prompts](https://www.npmjs.com/package/prompts)

## License

MIT License
