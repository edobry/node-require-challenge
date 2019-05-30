/*

Paperspace NodeJS Coding Challenge
Eugene Dobry

So, our goal here is to scan an arbitrary node.js project, on the local filesystem, and output the required modules.
There are several points of distinction to be made here:
1. "required modules" is a distinct concept from "dependencies"; we are not looking for packages referenced in config,
    or installed packages. this solutions must include only modules actually required in the project, including builtins

2. there is some uncertainty in the spec regarding the output format; do we want a list of modules, with the files they're in,
    or rather a list of files, and the modules included in each? for many possible usecases, the latter seems more appropriate,
    but the wording implies the former, so I'll go with that until I get a chance to clarify this. its an easy change to make later on.

3. there are MANY possible error modes for this project, such as the provided path not existing, the path being a file, the path not
    containing a node.js project, the files in the project being malformed javascript. the first few are pretty simple to guard for,
    but the last is slightly more complex. should we attempt to validate that each file is valid javascript? is that within scope?
    depending on the approach taken, the answer varies. if we decide to fully parse each file and work with the AST, it may be important.
    if we want to take the simpler, but more fragile approach of stringmatching requires, not so much.

    UPDATE: going with AST parsing, as the work has already been done by someone else, thanks OS community

4. the problem statement did not specify whether we're working with ES5, ES6, mjs, typescript, etc. one conclusion is that it may be prudent
    to handle all contingencies for the sake of completeness, but due to the added complexity of handling mjs, i'm going to opt for the path of
    only handling ES5/6 initially, and extending functionality later if need be, which is probably a better approach to take in a business setting

    UPDATE: handling ES5 (commonjs, amd) and ES6 (modules) since the package i'm using supports that

5. the problem statement also does not specify whether only the files directly in the folder should be considered, or also files in subfolders.
    since i've already written the recursive descent, continuing under the assumption that the intent was all files in the tree
*/

//first, lets gather what we need.
const
    //nconf is a configuration library, allowing us to bring in various sources of config in a standard way.
    //while this is overkill for such a simple project, i'm used to working with this library and it reduces
    //rampup time and allows me to focus on the core problem.
    nconf = require("nconf"),

    //this package parses a file, produces the AST, and then scans that for various forms of `require`s
    precinct = require("precinct"),

    //the builtin path module provides utilities for working with paths, which will come in useful
    path = require("path"),

    //the builtin fs (filesystem) module will allow us to actually interact with files on disk
    fs = require("fs"),
    //this gives us access to a few more convenient APIs
    fsP = fs.promises;

//here, i initialize nconf to look for config settings from the commandline, but to use the default value if none is provided
nconf.argv().defaults({
    //if no target is specified, just run on this project
    target: __dirname
});

//i'm going to setup a very simple error function here, to not have to rewrite this for every error class
const error = message => {
    console.log(message);
    process.exit(1);
};

//i get the path of the intended target project and validate it
const target = nconf.get("target");
if(!path.isAbsolute(target))
    error("Please provide an absolute path");

//NOTE: there are more modern patterns we could use here, like fs.promises and others,
//but i'm going to stick to the very simple, but less convenient, callback api

//now we're going to check whether the path exists, and is a directory
fs.stat(target, (err, stats) => {
    if(err)
        error(err.message);

    if(!stats.isDirectory())
        error("Please provide a path to a directory");

    //we're good, so lets get to the actual meat now
    parseFolder(target);
});

const excludedDirs = ["node_modules", ".git"];

const parseFolder = async dir => {
    //since i'm using the fs.promises api, i can `await` the result of the call
    const dirEntries = await fsP.readdir(dir, {
        //this option gives lets us easily check whether each dir entry is a file or not
        withFileTypes: true
    });

    //now i partition the directory entries into files and directories
    const { files, dirs } = dirEntries.reduce((acc, entry) => {
        if(entry.isFile())
            acc.files.push(entry.name);
        else if(entry.isDirectory())
            acc.dirs.push(entry.name);

        return acc;
    }, { files: [], dirs: [] });

    //process each file
    const fileValPs = Promise.all(files.map(parseFile(dir)));

    //process the subdirectories recursively
    const subDirs = await Promise.all(dirs
        .filter(dir => !excludedDirs.includes(dir))
        .map(parseFolder));

    const fileVals = await fileValPs;

    console.log(subDirs);
    console.log(fileVals);

    //this is definitely wrong but just writing it for now
    return [fileVals, ...subDirs];
};

const parseFile = dir => async name => {
    const contents = await fsP.readFile(`${dir}/${name}`, "utf8");

    const deps = precinct(contents);

    //leaving room here to do any processing if needed

    return deps;
};
