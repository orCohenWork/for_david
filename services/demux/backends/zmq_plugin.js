#!/usr/bin/env node


const { loadModels } = require('../../../extensions/tools/models');
const fetch = require('node-fetch');
const zmq = require('zeromq');

console.log('ZMQ connecting');
var ztype = process.env.SOCKET_MODE || 'sub';
const sock = zmq.socket(ztype);
sock.connect(`tcp://${process.env.NODEOS_HOST || 'localhost'}:${process.env.NODEOS_ZMQ_PORT || '5556'}`);
if (ztype == 'sub')
    sock.subscribe('action_trace');

var first = true;
console.log('ZMQ connected');
var i = 0;
sock.on('message', async(data) => {
    if (first) {
        console.log('Got first message');
        first = false
    }
    if (typeof(data) != 'string') {
        data = data.toString();
        if (data.indexOf('action_trace-') != 0)
            return;
        data = data.substr('action_trace-'.length);
    }
    if (i++ % 100 == 0)
        console.log(`processed: ${i / 100}`);
    var res;
    try {
        res = JSON.parse(data);
    }
    catch (e) {
        console.log(data, e);
        return;
    }
    switch (res.type) {
        case 'accepted_block':
            break;
        case 'action_trace':
            const body = res[res.type];
            await actionHandler(body['action_trace']);
            break;
        case 'irreversible_block':
            break;
        case 'failed_tx':
            break;
        default:
            console.log(res.type);
    }
});

let capturedEvents;
const loadEvents = async() => {
    if (!capturedEvents) {
        capturedEvents = {};
        const capturedEventsModels = await loadModels("captured-events");
        capturedEventsModels.forEach(a => {
            if (!a.eventType) {
                a.eventType = "*";
            }
            if (!a.contract) {
                a.contract = "*";
            }
            if (!a.method) {
                a.method = "*";
            }
            if (!capturedEvents[a.eventType]) {
                capturedEvents[a.eventType] = {};
            }
            if (!capturedEvents[a.eventType][a.contract]) {
                capturedEvents[a.eventType][a.contract] = {};
            }
            if (!capturedEvents[a.eventType][a.contract][a.method]) {
                capturedEvents[a.eventType][a.contract][a.method] = [];
            }
            capturedEvents[a.eventType][a.contract][a.method].push(a.webhook);
        })
    }
    return capturedEvents;
};
const handlers = {
    "*": {
        "*": {
            "*": async(account, method, code, actData, ev) => {
                console.log(account, method, code, actData);
                console.log(ev);
                let curr = await loadEvents();
                if (!curr[ev['etype']]) return;
                curr = curr[ev['etype']];
                if (!curr[code])
                    curr = curr['*'];
                else
                    curr = curr[code];
                if (!curr) return;

                if (!curr[method])
                    curr = curr['*'];
                else
                    curr = curr[method];
                if (curr) {
                    Promise.all(curr.map(async url => {
                        if (process.env.WEBHOOKS_HOST) {
                            url = url.replace("http://localhost:", process.env.WEBHOOKS_HOST);
                        }
                        const r = await fetch(url, {
                            headers: {
                                "Content-Type": "application/json"
                            },
                            method: 'POST',
                            body: JSON.stringify({
                                receiver: account,
                                method,
                                account: code,
                                data: actData,
                                event: ev
                            })
                        });
                        return r.text();
                    }));
                    console.log("fired hooks:", account, method, ev, code);
                }
            }
        }
    }
};

async function recursiveHandle({ account, method, code, actData, events }, depth = 0, currentHandlers = handlers) {
    if (depth === 3)
        return;

    let key = account;
    if (depth === 2) {
        key = events;
        if (Array.isArray(key)) {
            for (const currentEvent of key) {
                if (!currentEvent['etype'])
                    continue;
                await recursiveHandle({ account, method, code, actData, events: currentEvent }, depth, currentHandlers);
            }
            return;
        }
        key = events['etype'];
    }
    if (depth === 1) {
        key = method;
    }
    let subHandler = currentHandlers[key];
    if (!subHandler && depth === 0) {
        key = code;
        subHandler = currentHandlers[key];
    }
    if (!subHandler)
        subHandler = currentHandlers['*'];

    if (subHandler) {
        if (typeof subHandler === 'function') {
            return await subHandler(account, method, code, actData, events);
        }
        else if (typeof subHandler === 'object') {
            return recursiveHandle({ account, method, code, actData, events }, depth + 1, subHandler);
        }
        else {
            console.log(`got action: ${code}.${method} ${account === code ? "" : `(${account})`} - ${JSON.stringify(events)}`);
        }
    }
    else {
        console.log(`no handler for action: ${code}.${method} ${account === code ? "" : `(${account})`} - ${JSON.stringify(events)}`, currentHandlers, key);
    }
}

async function parseEvents(text) {
    return text.split('\n').map(a => {
        if (a === "")
            return null;
        try {
            return JSON.parse(a);
        }
        catch (e) {}
    }).filter(a => a);
}


async function actionHandler(action) {
    const events = await parseEvents(action['console']);
    await recursiveHandle({
        account: action['receipt']['receiver'],
        method: action['act']['name'],
        code: action['act']['account'],
        actData: action['act']['data'],
        events: events
    });
    for (const inline_trace of action['inline_traces']) {
        await actionHandler(inline_trace);
    }
}
