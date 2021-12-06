import { default as md } from "../../lib/index.mjs";

const unordered_list = new md.List(['First element', new md.Bold('Bold element')]);
unordered_list.push(new md.ListEntry([
	'Sub-list', 
	new md.List([
		'A sub-entry!',
		new md.Italic('Italic element')
	])])
);
unordered_list.push(new md.ListEntry([
	'Sub-list', 
	new md.List([
		new md.ListEntry([
			'A sub-entry... with a sub-list!',
			new md.List([
				'A sub-sub-entry',
				new md.Underline('Underlined entry')
			])
		]),
		new md.Italic('Italic element')
	])])
);
unordered_list.push('One last element');

console.log(unordered_list.toString() + '\n\n');

const ordered_list = new md.List(['First element', new md.Bold('Bold element')], true);
ordered_list.push(new md.ListEntry([
	'Sub-list', 
	new md.List([
		'A sub-entry!',
		new md.Italic('Italic element')
	])])
);
ordered_list.push(new md.ListEntry([
	'Sub-list', 
	new md.List([
		new md.ListEntry([
			'A sub-entry... with a sub-list!',
			new md.List([
				'A sub-sub-entry',
				new md.Underline('Underlined entry')
			])
		]),
		new md.Italic('Italic element')
	], true)])
);
ordered_list.push('One last element');

console.log(ordered_list.toString());
