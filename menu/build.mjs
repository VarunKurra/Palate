import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import { build } from "esbuild";
await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  external: ["*.woff2"],
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: "app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "linked",
});
console.log("Built menu/app.js and menu/app.css");

let html=readFileSync("index.html","utf8");
for(const asset of ["app.js","app.css"]){
 const version=createHash("sha256").update(readFileSync(asset)).digest("hex").slice(0,10);
 html=html.replace(new RegExp(`(["'])${asset.replace(".","\\.")}(?:\\?[^"']*)?(["'])`,"g"),`$1${asset}?v=${version}$2`);
}
writeFileSync("index.html",html);
