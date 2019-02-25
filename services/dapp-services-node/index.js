#!/usr/bin/env node 

require("babel-core/register");
require("babel-polyfill");
if(process.env.DAEMONIZE_PROCESS)
    require('daemonize-process')();

const {genNode, genApp, paccount, processFn, forwardEvent, resolveProviderData, resolveProvider} = require('./common');
const actionHandlers = {
    'service_request':async (act, simulated)=>{
        let {service, provider} = act.event;
        var payer = act.receiver;
        provider = await resolveProvider(payer, service, provider);
        var providerData = await resolveProviderData(service, provider);
        if(!providerData)
            throw new Error("provider data not found");
        if(act.exception || paccount == provider)
            return await forwardEvent(act, providerData.endpoint, act.exception);
    },
    'service_signal':async (act, simulated)=>{
        if(simulated)
            return;
        let {service, provider} = act.event;
        if(paccount != provider)
            return;
        var providerData = await resolveProviderData(service, provider);
        if(!providerData)
            throw new Error("provider data not found");
        return await forwardEvent(act, providerData.endpoint);
    },
    'usage_report':async (act, simulated)=>{
        if(simulated)
            return;
        let {service, provider} = act.event;
        if(paccount != provider)
            return;
        var providerData = await resolveProviderData(service, provider);
        if(!providerData)
            throw new Error("provider data not found");
        return await forwardEvent(act, providerData.endpoint);
    }
}


genNode(actionHandlers, process.env.PORT || 3115, "services");

const appWebHookListener = genApp();
appWebHookListener.post('/', async (req, res) => {
    // var account = req.body.account;
    // var method = req.body.method;
    // var receiver = req.body.receiver;
    // var event = req.body.event;
    // var data = req.body.data;
    // console.log("req.body",req.body);
    await processFn(actionHandlers, req.body);
    res.send(JSON.stringify("ok"));
});

appWebHookListener.listen(process.env.WEBHOOKPORT || 8812, () => console.log(`service node webhook listening on port ${process.env.WEBHOOKPORT || 8812}!`));
