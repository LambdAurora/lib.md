import { EOF_TOKEN_TYPE, Lexer, TokenMatcher, TokenType } from "../lib/parser.mjs";

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

			if (c == '_' && i == 0) {
				if (i == input.length - 1) return 0;
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

function is_identifier_character(char) {
	return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
}

// Test Lexer
{
	const expected_tokens = MATH_TOKEN_TYPES;
	const lexer = new Lexer(expected_tokens, "() , = + - * /\t**! |mod   536.25i hello_world");

	for (const expected_token of expected_tokens) {
		const got_token = lexer.next().value;

		console.log(got_token);

		if (expected_token !== got_token.type) {
			throw new Error(`Expected to find ${expected_token}, found ${got_token}.`);
		}
	}
}

// Test Literal Lexer
{
	const to_test = "1 2 3 4 56.3 25E3 25E-3 56i 56.4i 0.3 26E-3i";
	const lexer = new Lexer(MATH_TOKEN_TYPES, to_test);

	let i = 0;
	for (const token of lexer) {
		console.log(token);

		if (token.type !== MATH_TOKEN_TYPES[12]) {
			throw new Error(`Expected LITERAL got ${token} (i=${i}).`);
		}

		i++;
	}

	const expected = to_test.split(" ").length;
	if (expected !== i) {
		throw new Error(`Expected ${expected} literals, got ${i}.`);
	}
}
