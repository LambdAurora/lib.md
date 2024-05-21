import * as esbuild from "https://deno.land/x/esbuild@v0.21.3/mod.js";
import { BUILD_DIR, ENTRYPOINT, SOURCES_DIR, build_bundle } from "./base.ts";

try {
	await Deno.remove(BUILD_DIR, {recursive: true});
} catch (e) {
	if (!(e instanceof Deno.errors.NotFound)) {
		throw e;
	}
}

const files: string[] = [];

async function collect_files(dir: string, files: string[]) {
	for await (const file of Deno.readDir(dir)) {
		if (file.isFile && file.name.endsWith(".ts")) {
			files.push(dir + file.name);
		} else if (file.isDirectory) {
			await collect_files(`${dir}${file.name}/`, files);
		}
	}
}

await collect_files(SOURCES_DIR, files);

await esbuild.build({
	entryPoints: [
		ENTRYPOINT,
		...files
	],
	format: "esm",
	bundle: true,
	sourcemap: true,
	outExtension: {
		".js": ".mjs"
	},
	outdir: BUILD_DIR,
	plugins: [
		{
			name: "add-mjs",
			setup(build) {
				build.onResolve({filter: /.*/}, args => {
					if (args.importer) {
						return {path: args.path.replace(/\.ts$/, ".mjs"), external: true}
					}
				})
			},
		}
	],
});

await build_bundle(ENTRYPOINT, `${BUILD_DIR}/mod.min.mjs`);

await esbuild.stop();
