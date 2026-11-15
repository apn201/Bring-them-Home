# webAGC Demo

This demo combines the following components:

* `webAGC` (wraps a WebAssembly build of `yaAGC`)
* `webDSKY` (an emulator of the user interface of the AGC)
* Control elements
  * CPU manipulation: reset, halt, run, step, clock divide
  * 'Hot-plugging' of the "fixed memory" (the 'ROM') of the AGC. In other words, plugging different
      programs into the computer while it is running.  (see below, "AGC programs")
* Live views of the AGC state
  * erasable memory with register labels and explanations
  * interactive input ports and output ports

## AGC programs

This demo allows the selection of the following AGC programs which are contained in this repository
in binary form.  A link to the exact state of the source code and build scripts is given in the
third column of the table.

Documentation of these AGC programs can be found at https://www.ibiblio.org/apollo/

<table>
<thead>
  <tr>
    <th>Name</th>
    <th>Binary</th>
    <th>Sources</th>
    <th>Notes</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td>Luminary099</td>
    <td><a href="agc/Luminary099.bin">agc/Luminary099.bin</a></td>
    <td><a href="https://github.com/virtualagc/virtualagc/tree/92a74ef1c88aede2e4ba0a86c6585c9ea911226d/Luminary099">Source</a></td>
    <td>Built by running <code>make</code> in the root directory.</td>
  </tr>
  <tr>
    <td>Comanche055</td>
    <td><a href="agc/Comanche055.bin">agc/Comanche055.bin</a></td>
    <td><a href="https://github.com/virtualagc/virtualagc/tree/92a74ef1c88aede2e4ba0a86c6585c9ea911226d/Comanche055">Source</a></td>
    <td>Built by running <code>make</code> in the root directory.</td>
  </tr>
  <tr>
    <td>Validation</td>
    <td><a href="agc/Validation.bin">agc/Validation.bin</a></td>
    <td><a href="https://github.com/virtualagc/virtualagc/tree/92a74ef1c88aede2e4ba0a86c6585c9ea911226d/Validation">Source</a></td>
    <td>Built by running <code>make</code> in the root directory.</td>
  </tr>
</tbody>
</table>


## Architecture

A client-only, static, HTML + JavaScript + CSS, browser application.

To align with the goals of *permacomputing*, it is very conservative on the selection of infrastructure and frameworks to ensure long-time reproducibility. It codes directly on top of *Web Components*, which is a fully stable, production-ready feature built directly into all modern web browsers. While this makes the code not as concise as it could be in the newest JavaScript framework *du jour*, this was still an acceptable trade-off given the relatively small size of the application. 

While the final build is simple, a bit more complexity lies in the building and serving.

Modern browsers insist on HTTP for content delivery for anything except the most basic HTML, which is also required for this application.

### Development

Tools from https://github.com/modernweb-dev/web have been chosen because of the simplicity and closeness to standard browser features.

During development, the web server `@web/dev-server` resolves on the fly bare imports of modules in `node_modules`. It also sends requested JavaScript files through `esbuild` to transpile modern features into a more widely supported `es2020`/`ES11` JavaScript.

### Building

rollup.js has been chosen to produce the final build.

### Serving

The build can be served by any HTTP server capable to serve static files.



## How to run

Get a recent version of Node.js. Confirmed working is v22.22.2.

To install dependencies for development and building, run `npm ci` (clean install) in this (demo) directory.

### Development

To start a web server, run `npm run serve-dev` in this (demo) directory. It will output the URL to open in a browser of choice (e.g. http://localhost:8000).


### Building and serving

Run in this directory:

```sh
npm run build
```

The files in the `build` directory are ready for static file hosting behind any HTTP URL.

To validate, you can serve the built files using the Node.js based static file web server `light-server`:

```sh
npm run serve-build
```

To prove that the built files no longer have any dependencies on the Node.js ecosystem,
you can serve the files using a Ruby web server, for example:

```sh
gem install webrick
ruby -r un -e httpd build -p 8000
```

A copy of the build is hosted at https://michaelfranzl.github.io/webAGC/demo

