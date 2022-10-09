import { assertEquals } from "@std/testing/asserts.ts";
import { EOF_TOKEN_TYPE, Lexer, TokenMatcher, TokenType } from "../src/parser.mjs";

const MATH_TOKEN_TYPES = [
	new TokenType("LEFT_PAREN", TokenMatcher.of_character("(", false)),
	new TokenType("RIGHT_PAREN", TokenMatcher.of_character(")", false)),
	new TokenType("COMMA", TokenMatcher.of_character(",", false)),
	new TokenType("ASSIGN", TokenMatcher.of_character("=")),
	new TokenType("PLUS", TokenMatcher.of_character("+")),
	new TokenType("MINUS", TokenMatcher.of_character("-")),
	new TokenType("ASTERISK", TokenMatcher.of_character("*")),
	new TokenType("SLASH", TokenMatcher.of_character("/")),
	new TokenType("EXPONENT", TokenMatcher.of_string("**")),
	new TokenType("EXCLAMATION", TokenMatcher.of_character("!")),
	new TokenType("PIPE", TokenMatcher.of_character("|")),
	new TokenType("MOD", TokenMatcher.of_string("mod")),
	new TokenType("LITERAL", TokenMatcher.of_number_literal({ float: true, complex: true })),
	new TokenType("IDENTIFIER", input => {
		let i = 0;
		while (i < input.length) {
			const c = input[i];

			if (c === '_' && i === 0) {
				if (i === input.length - 1) return 0;
				else if (!is_identifier_character(input[i + 1])) return 0;
			} else if (!is_identifier_character(c)) {
				break;
			}

			i++;
		}

		return { length: i };
	}),
	EOF_TOKEN_TYPE
];

function is_identifier_character(char: string) {
	return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
}

// Test Lexer
Deno.test("Lexer", () => {
	const expected_tokens = MATH_TOKEN_TYPES;
	const lexer = new Lexer(expected_tokens, "() , = + - * /\t**! |mod   536.25i hello_world");

	for (const expected_token of expected_tokens) {
		const got_token = lexer.next().value;

		console.log(got_token);

		assertEquals(got_token.type, expected_token);
	}
});

// Test Literal Lexer
Deno.test("Literal Lexer", () => {
	const to_test = "1 2 3 4 56.3 25E3 25E-3 56i 56.4i 0.3 26E-3i";
	const lexer = new Lexer(MATH_TOKEN_TYPES, to_test);

	let i = 0;
	for (const token of lexer) {
		console.log(token);

		assertEquals(token.type, MATH_TOKEN_TYPES[12]);

		i++;
	}

	const expected = to_test.split(" ").length;
	assertEquals(i, expected);
});
