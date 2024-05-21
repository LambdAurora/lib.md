import * as esbuild from "@esbuild/mod.js";
import { denoPlugins } from "@luca/esbuild-deno-loader";

export const CWD = Deno.cwd();
export const SOURCES_DIR = "./lib/";
export const ENTRYPOINT = "./mod.ts";

export const BUILD_DIR = "dist";

export async function build_bundle(entrypoint: string, out_file: string) {
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
