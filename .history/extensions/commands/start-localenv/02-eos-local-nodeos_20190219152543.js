var { execPromise } = require('../../helpers/_exec');
var sleep = require('sleep-promise');
var dappservices;
var path = require('path');
var fs = require('fs');
if (fs.existsSync(path.resolve('extensions/tools/eos/dapp-services.js')))
    dappservices = require("../../tools/eos/dapp-services");

const dockerrm = async(name) => {
    try {
        await execPromise(`docker rm -f ${name}`);
    }
    catch (e) {

    }
}
module.exports = async(args) => {
    if (args.creator !== 'eosio')
        return; // only local
    await dockerrm("zeus-eosio");
    var nodeos = process.env.DOCKER_NODEOS || "liquidapps/eosio-plugins:v1.6.1";

    var moreargs = [
        "-e",
        "-p eosio",
        "--plugin eosio::producer_plugin",
        "--disable-replay-opts",
        "--plugin eosio::history_plugin",
        "--plugin eosio::chain_api_plugin",
        "--plugin eosio::history_api_plugin",
        "--plugin eosio::http_plugin",
        "-d /mnt/dev/data",
        "--config-dir /mnt/dev/config",
        "--http-server-address=0.0.0.0:8888",
        "--access-control-allow-origin=*",
        "--contracts-console",
        "--max-transaction-time=150000",
        "--http-validate-host=false",
        "--verbose-http-errors"
    ];
    var ports = [
        "-p 8888:8888",
        "-p 9876:9876"
    ]

    if (dappservices) {
        console.log('Initing dappservices plugins');
        var backend = process.env.DEMUX_BACKEND || "zmq_plugin";
        var { dappServicesContract } = dappservices;
        switch (backend) {
            case "state_history_plugin":
                moreargs = [...moreargs,
                    "--trace-history",
                    "--plugin eosio::state_history_plugin",
                ];
                ports = [...ports,
                    "-p 8889:8080"
                ];
                break;
            case "zmq_plugin":
                moreargs = [...moreargs,
                    "--plugin=eosio::zmq_plugin",
                    "--zmq-enable-actions",
                    "--zmq-sender-bind=tcp://0.0.0.0:5556",
                    "--zmq-publisher-bind=tcp://0.0.0.0:5557",
                    "--zmq-enable-pub-socket",
                    // `--zmq-whitelist-account ${dappServicesContract}`
                ];
                ports = [...ports,
                    "-p 5556:5556",
                    "-p 5557:5557"
                ];
                break;
        }
    }

    var res = await execPromise(`docker run --name zeus-eosio --rm -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${moreargs.join(' ')}"`);
    await sleep(2000);
    // await execPromise(`docker logs zeus-eosio`);
};
