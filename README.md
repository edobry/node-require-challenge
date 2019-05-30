### NodeJS Require challenge

This project scans an arbitrary NodeJS directory and returns a list of the `require`ed modules, including core and local. CommonJS, AMD, and JS Module require types are supported.

#### Setup

   - Install >= node.js 10
   - Clone this project
   - Run `npm install`

#### Usage

This project takes two commandline flags:
   - `--target`: accepts an absolute filesystem path to scan, if not provided scans itself
   - `--quiet`: disables all logging for programmatic usage

#### Example

Scan a local project quietly

```bash
node ~/Projects/node-require-challenge --target ~/Projects/some-other-project --quiet
```

If you need a sample project to test this on, feel free to use my [mucks](https://github.com/edobry/mucks) project.
