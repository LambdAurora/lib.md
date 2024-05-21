import { Application } from "@oak/oak";
import { serve_files } from "@lambdaurora/lambdawebserver";
import { build_bundle } from "./base.ts";

const EXAMPLES_BUILD_DIR = "./build";

await build_bundle("examples/rendering_simple/script.ts", `${EXAMPLES_BUILD_DIR}/rendering_simple/script.js`);
await build_bundle("examples/previewer/script.ts", `${EXAMPLES_BUILD_DIR}/previewer/script.js`);

const app = new Application();

app.use(serve_files("./examples/"));
app.use(serve_files(EXAMPLES_BUILD_DIR));

app.listen({ port: 8080 });

console.log("Explore those examples:");
console.log("  http://localhost:8080/previewer");
console.log("  http://localhost:8080/rendering_simple");
