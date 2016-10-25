const fs = require('mz/fs');
const co = require('co');

const path = "../../../github/corinthian/lib-source/v2";

const jsonlog = (...args) => {
    for (const item of args) {
        console.log(JSON.stringify(item, null, '  '));
    }
};

function* entries(object) {
    for (const key in object) {
        yield [key, object[key]];
    }
}

const source = `
/**
    @type Function
    @name ajax
    @desc
        Sends an async ajax request to the specified url.
    @return {Promise}
        Returns a promise that resolves with the result of the ajax request.
        The resolved value is an object with the 'status', 'statusText', and
        'response' properties. The type of 'response' depends on the type
        option if specified.
        @property {Number} status
        @property {String} statusText
        @property {*} response
    @param {String} url
        The url to request.
    @param {object} [optional] options
        @property {Object} [optional] headers
            Additional headers to send with the request.
            Format is {header: headerValue}.
            Default sends no additional headers.
        @property {Number} [optional] timeout
            The amount of time to wait before closing the connection.
            Set to 0 to let connections try as long as possible.
            Default is 0.
        @property {String} [optional] type
            The type of object to return from the ajax request.
            Valid options depend on the browser.
            See the [link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType MDN Docs] for details.
            Default is null (text).
        @property {Function} [optional] onProgress
            A function to call while the request is loading.
            Should take one argument that is the ProgressEvent.
        @property {ajax.cancelToken} [optional] token
            A cancellatio token for the request.
            A cancelled ajax request will not throw an error, instead it
            will return null.
        @property {*, FormData} [optional] post
            Post data to send with the request.
            If the object is not a FormData object, it will have JSON.stringify
            called on it before it is sent.
*/
`.trim();
const source2 = `/**
            @type Function
            @name requestData
            @parent App.API
            @static
            @param {String} url
                The url to request. This is the path specified in the app.xml file,
                NOT the full web address.
            @param {Object} options
                See [link #ajax.param.options ajax options].
            @return {Promise}
                Returns a promise that resolves with the result of the ajax request
                parsed into an object. The resolved value will be the result of
                calling JSON.parse on the response.
        */
`.trim();

const formatLines = source => {
    const lines = source.slice(3, -2).split(/\r?\n/).filter(line => line.trim() !== "");
    const transformed = [];
    let currentLine = null;

    for (let line of lines) {
        const count = line.match(/^\s*/g)[0].length;
        line = line.trim();
        if (line.charAt(0) === "@") {
            currentLine = {count, text: line};
            transformed.push(currentLine);
        } else {
            currentLine.text += ' ' + line;
        }
    }

    return transformed;
};

const groupLines = (lines, node = {}) => {
    const stack = [];
    let current = [];
    let prevCount = lines[0].count;

    for (const line of lines) {
        if (line.count > prevCount) {
            let next = [];
            current.push(next);
            stack.push(current);
            current = next;
        }
        if (line.count < prevCount) {
            current = stack.pop();
        }

        prevCount = line.count;
        current.push(line.text);
    }

    while (stack.length > 0) {
        current = stack.pop();
    }

    return current;
};

const getTypeNames = info => {
    let text = "";
    let index = 0;
    while (true) {
        if (index >= info.length) {
            break;
        }
        text += info[index];
        index += 1;
        if (text.slice(-1) === "}") {
            break;
        }
    }
    return [text.slice(1, -1).split(/\s*,\s*/), index];
};
const getFlags = (info, index) => {
    let flags = [];
    while (true) {
        if (index >= info.length) {
            break;
        }
        if (info[index].charAt(0) !== "[") {
            break;
        }
        flags.push(info[index].slice(1, -1));
        index += 1;
    }

    return [flags, index];
};
const getText = (info, index) => {
    while (true) {
        if (index >= info.length) {
            break;
        }
        if (info[index].charAt(0) === "@") {
            break;
        }
        index += 1;
    };

    return index;
};
const setProp = (prop) =>
    (node, info) => {
        node[prop] = info[0];
        return node[prop];
    };
const setBoolProp = (prop) =>
    (node, info) => {
        node[prop] = true;
        return node[prop];
    };
const setPropExtra = prop =>
    (node, info) => {
        if (node[prop] === undefined) {
            node[prop] = [];
        }
        const [pType, typeEndIndex] = getTypeNames(info);
        const [flags, flagEndIndex] = getFlags(info, typeEndIndex);
        const itemNode = {
            name: info[flagEndIndex],
            type: pType,
            desc: info.slice(flagEndIndex + 1).join(' '),
            flags
        };
        node[prop].push(itemNode);
        return itemNode;
    };
const parsers = {
    type: setProp('type'),
    name: setProp('name'),
    parent: setProp('parent'),
    static: setBoolProp('static'),
    desc: (node, info) => {
        node.desc = info.join(' ');
        return node.desc;
    },
    return: (node, info) => {
        let endDescIndex = 0;
        node.return = {
            type: info[0],
            desc: info.slice(1).join(' ')
        };
        return node.return;
    },
    param: setPropExtra('param'),
    property: setPropExtra('property')
};
const nodeify = (info, node = {}) => {
    let lastNode = null;

    for (const piece of info) {
        if (typeof piece === 'string') {
            const [type, ...items] = piece.slice(1).split(/\s+/);
            if (parsers[type] === undefined) {
                throw new Error(`No parser exists for '${type}'`);
            }
            lastNode = parsers[type](node, items);
        } else {
            nodeify(piece, lastNode);
        }
    }

    return node;
};

const parseDocs = docString => nodeify(groupLines(formatLines(docString)));

co(function* () {
    // return;
    let items = [];
    for (const filename of yield fs.readdir(path)) {
        const code = yield fs.readFile(`${path}/${filename}`, {encoding: 'utf8'});
        const docComments = code.match(/\/\*\*(.|\s)*?\*\//g);

        if (docComments !== null) {
            for (const comments of docComments) {
                items.push(parseDocs(comments));
            }
        }
    }

    let artifacts = {};
    for (const item of items) {
        const {parent, name, type, global} = item;
        let itemName = name;
        let ownPage = true;

        if (parent !== undefined) {
            itemName = `${parent}.${name}`;
            if (type === 'Function' && global !== true) {
                ownPage = false;
            }
        }
        artifacts[itemName] = item;
    }

    let marked = new Set();
    for (const [key, item] of entries(artifacts)) {
        if (key.indexOf(".") !== -1) {
            if (artifacts[item.parent] === undefined) {
                throw new Error(`No parent data found for ${key}`);
            }
            const parent = artifacts[item.parent];
            if (parent.property === undefined) {
                parent.property = [];
            }
            parent.property.push(item);
            marked.add(key);
        }
        // console.log(key, key.indexOf(".") !== -1 && artifacts[item.parent] !== undefined);
    }
    for (const key of marked) {
        delete artifacts[key];
    }
    for (const [key] of entries(artifacts)) {
        console.log(key);
    }

    console.log('writing data...');
    yield fs.writeFile("data.json", JSON.stringify(artifacts, null, '  '), {encoding: 'utf8'});
    console.log('done');
});

// const docs = [parseDocs(source), parseDocs(source2)];

// jsonlog(parseDocs(source2));

// jsonlog(
//     parseDocs(source),
//     parseDocs(source2)
// );
