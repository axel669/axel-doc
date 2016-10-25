const fs = require('mz/fs');
const co = require('co');

const path = "../../../github/corinthian/lib-source/v2";

const TokenStream = generator => {
    const tokens = Array.from(generator);
    let index = 0;
    return {
        get done() {
            return index >= tokens.length;
        },
        next() {
            if (index >= tokens.length) {
                return null;
            }
            const token = tokens[index];
            index += 1;
            return token;
        },
        peek() {
            if (index >= tokens.length) {
                return null;
            }
            return tokens[index];
        }
    };
};

const tokenizeLine = function* (line) {
    let index = 0;

    if (line.trim() === "") {
        return;
    }

    {
        const count = line.match(/^[\s]*/)[0].length;
        yield {type: "space", count, index};
        index += count;
    }
    while (true) {
        index += line.substr(index).match(/^\s*/g)[0].length;
        if (index >= line.length) {
            break;
        }
        switch (line.charAt(index)) {
            case "@": {
                const prop = line.slice(index + 1).match(/^[a-z]\w*/gi)[0];
                yield {type: 'prop', name: prop, index};
                index += prop.length + 1;
                break;
            }
            case "[": {
                break;
            }
            default: {
                const text = line.slice(index).match(/^[^\s]+/g)[0];
                yield {type: 'text', text, index};
                index += text.length;
            }
        }
    }
};
const tokenizeDocString = function* (docString) {
    const lines = docString.split(/\r?\n/).filter(line => line.trim() !== "");
    for (const [lineNum, line] of lines.entries()) {
        for (const token of tokenizeLine(line)) {
            token.line = lineNum + 1;
            yield token;
        }
    }
};

const validateType = (token, expected) => {
    if (token === null || token.type !== expected) {
        throw 0;
    }
};
const readDesc = tokenizer => {
    const desc = [];

    mainLoop: while (true) {
        const next = tokenizer.peek();
        switch (next.type) {
            case 'space': {
                tokenizer.next();
            }
            case 'text': {
                desc.push(tokenizer.next().text);
                break;
            }
            default: {
                break mainLoop;
            }
        }
    }

    return desc.join(' ');
};
const tokenProcesor = {
    space: (stack, node, tokenizer, token) => {
        if (node.indent === undefined) {
            node.indent = token.count;
        } else {
            if (node.indent > token.count) {
            }
            if (node.index < token.count) {
                stack = [...stack, node];
                node = {indent: token.count};
            }
        }
        return [stack, node];
    },
    prop: (stack, node, tokenizer, token) => {
        propertyParser[token.name](tokenizer, node, token);
        return [stack, node];
    }
};
const propertyParser = {
    type: (tokenizer, node, token) => {
        const next = tokenizer.next();
        validateType(next, 'text');
        node.type = next.text;
    },
    name: (tokenizer, node, token) => {
        const next = tokenizer.next();
        validateType(next, 'text');
        node.name = next.text;
    },
    return: (tokenizer, node, token) => {
        let type = "";
        while (true) {
            const next = tokenizer.next();
            validateType(next, 'text');
            type += next.text;
            if (type.slice(-1) === "}") {
                break;
            };
        }
        let name = tokenizer.next();
        validateType(name, 'text');
        name = name.text
        node.returnInfo = {
            type,
            name,
            desc: readDesc(tokenier)
        };
    }
};

co(function* () {
    try {
        for (const filename of yield fs.readdir(path)) {
            const code = yield fs.readFile(`${path}/${filename}`, {encoding: 'utf8'});
            const docComments = code.match(/\/\*\*(.|\s)*?\*\//g);
            console.log(filename);
            if (docComments !== null) {
                for (const docString of docComments) {
                    console.log(docString);
                    const tokenizer = tokenizeDocString(docString.slice(3, -2));
                    let node = {};
                    let stack = [];
                    let tokenStream = TokenStream(tokenizer);
                    // for (const token of tokenizer) {
                    while (true) {
                        if (tokenStream.done === true) {
                            break;
                        }
                        const token = tokenStream.next();
                        console.log('@', token);
                        console.log(stack, node);
                        [stack, node] = tokenProcesor[token.type](stack, node, tokenStream, token);
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
});
