import { build_bundle, clear_dir } from "./base.ts";
import { copy } from "@std/fs";
import * as esbuild from "@esbuild/mod.js";

const DEPLOY_BUILD_DIR = "./build";

await clear_dir(DEPLOY_BUILD_DIR);

await copy("examples", `${DEPLOY_BUILD_DIR}/examples`);

await build_bundle("examples/rendering_simple/script.ts", `${DEPLOY_BUILD_DIR}/examples/rendering_simple/script.js`);
await build_bundle("examples/previewer/script.ts", `${DEPLOY_BUILD_DIR}/examples/previewer/script.js`);

await esbuild.stop();
