const url = require('url');

exports.onRequest = onRequest;
exports.onFinish = onFinish;
exports.onError = onError;

exports.context = context;
exports.response = response;

function onRequest() {}

function onFinish() {}

function onError(err, res) {
    console.error(err);

    if (res.finished) {
        return;
    }
    res.end(err.toString());
}

async function context(req) {
    let parsed = url.parse(req.url, true);

    return {
        method: req.method,
        httpVersion: req.httpVersion,
        url: req.url,
        header: req.headers,
        pathname: parsed.pathname,
        query: parsed.query,
        search: parsed.search,
        params: {},
        body: {}
    };
}

async function response(res, ctx, ret) {
    res.setHeader('content-type', 'application/json; charset=utf8');
    return res.end(JSON.stringify(ret));
}