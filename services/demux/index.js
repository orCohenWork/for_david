#!/usr/bin/env node

require("babel-core/register");
require("babel-polyfill");
if (process.env.DAEMONIZE_PROCESS)
    require('daemonize-process')();

var backend = process.env.DEMUX_BACKEND || "zmq_plugin";

require(`./backends/${backend}`);
