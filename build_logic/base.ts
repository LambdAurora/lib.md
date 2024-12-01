import * as esbuild from "@esbuild/mod.js";
import { denoPlugins } from "@luca/esbuild-deno-loader";

export const CWD = Deno.cwd();
export const SOURCES_DIR = "./lib/";
export const ENTRYPOINT = "./mod.ts";

export const BUILD_DIR = "dist";

export async function clear_dir(dir: string) {
	try {
		await Deno.remove(dir, {recursive: true});
	} catch (e) {
		if (!(e instanceof Deno.errors.NotFound)) {
			throw e;
		}
	}
}

export async function build_bundle(entrypoint: string, out_file: string) {
	console.log(`Building bundle ${entrypoint}...`);

	await esbuild.build({
		entryPoints: [
			entrypoint
		],
		format: "esm",
		bundle: true,
		minify: true,
		sourcemap: true,
		outfile: out_file,
		plugins: [...denoPlugins({
			configPath: CWD + "/deno.json"
		})],
	});
}
