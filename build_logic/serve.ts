import { Application, Middleware, send } from "@oak/oak";
import { build_bundle } from "./base.ts";

import * as path from "@std/path/mod.ts";

export type FilePathMode = "strict" | "redirect_to_html" | "serve_without_html_ext";

export interface StaticFileServingOptions {
	/**
	 * `true` if folder paths are accepted and redirect to their respective `index.html` files, or `false` otherwise.
	 *
	 * @default true
	 */
	folder_path_to_index?: boolean;
	/**
	 * Determines how file paths that don't have a direct hit are handled if the accepted content type is HTML.
	 *
	 * @default "redirect_to_html"
	 */
	file_path_without_html_ext?: FilePathMode;
	/**
	 * `true` if brotli variants of files should be searched and sent instead when possible, or `false` otherwise
	 *
	 * @default true
	 */
	brotli?: boolean;
}

/**
 * Creates a middleware serving the files from the given root path.
 *
 * @param root_path the root path where the files reside
 * @param options the serving options
 * @return {Middleware} the middleware
 */
export function serve_files(root_path: string, options?: StaticFileServingOptions): Middleware {
	const known_options = {
		folder_path_to_index: true,
		file_path_without_html_ext: "redirect_to_html",
		brotli: true
	};
	if (options) Object.assign(known_options, options);

	// Important to not false-positive on the later normalize test.
	root_path = path.normalize(root_path);

	return async (context, next) => {
		const accept_html = context.request.headers.get("accept")?.includes("text/html");
		let file_path = decodeURIComponent(context.request.url.pathname);
		const expect_directory = file_path.endsWith("/");
		let should_try_directory = known_options.folder_path_to_index;

		if (!path.normalize(root_path + file_path).startsWith(root_path)) {
			// Someone tried to sneak up and access files outside the root directory.
			return await next();
		}

		async function test_file(path: string) {
			// Try opening the file.
			try {
				const file = await Deno.open(root_path + path, {read: true});
				const stat = await file.stat();
				file.close();

				return stat.isFile;
			} catch {
				return false;
			}
		}

		async function attempt_to_serve_with_html_ext(p: string) {
			if (known_options.file_path_without_html_ext === "redirect_to_html") {
				context.response.redirect(p);
			} else {
				await attempt_to_serve(p);
			}
		}

		async function attempt_to_serve(p: string) {
			await send(context, p, {
				root: root_path,
				brotli: known_options.brotli
			});
		}

		if (expect_directory) {
			if (!accept_html) {
				// The client wants a non-HTML file but gave a directory path.
				// We cannot predict exactly what file it wants then, so give up.
				return await next();
			}

			should_try_directory = false;

			if (known_options.folder_path_to_index) {
				const search_path = file_path + "index.html";

				if (await test_file(search_path)) {
					// Hooray, we found the index file.
					await attempt_to_serve(search_path);
					return;
				} else if (known_options.file_path_without_html_ext !== "strict") {
					const new_path = file_path.replace(/\/$/, ".html");
					// We're not in strict mode, so we can try a file with the same name!
					if (await test_file(new_path)) {
						await attempt_to_serve_with_html_ext(new_path);
						return;
					}
				} else return await next(); // It's in strict mode, we're out of luck.
			}

			if (known_options.file_path_without_html_ext === "strict") return;
			file_path = file_path.substring(0, file_path.length - 1);
		}

		if (await test_file(file_path)) {
			// We found the file so let's serve it!
			await attempt_to_serve(file_path);
			return;
		} else if (accept_html && !file_path.endsWith(".html") && known_options.file_path_without_html_ext !== "strict") {
			// We know we want an HTML file, and the file doesn't end with .html... Let's try by adding the extension.
			const html_file_path = file_path + ".html";

			if (await test_file(html_file_path)) {
				// Yay! The file with the .html exists, time to serve.
				await attempt_to_serve_with_html_ext(html_file_path);
				return;
			} else if (should_try_directory && await test_file(file_path + "/index.html")) {
				// The file did not exist, but we had one last chance: testing for directories, and it worked!
				if (known_options.file_path_without_html_ext === "redirect_to_html") {
					context.response.redirect(file_path + "/");
				} else {
					await attempt_to_serve(file_path + "/index.html");
				}

				return;
			}
		}

		return await next();
	};
}

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
