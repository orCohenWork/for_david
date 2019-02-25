var path = require('path');
var fs = require('fs');
const { loadModels } = require("../../tools/models");
const { emojMap } = require("../../helpers/_exec");
const { dappServicesContract, getContractAccountFor } = require("../../tools/eos/dapp-services");



const CMAKELISTS_FILE = `
get_filename_component(PROJ_NAME "\${CMAKE_CURRENT_SOURCE_DIR}" NAME )
cmake_minimum_required(VERSION 3.5)
project(\${PROJ_NAME} VERSION 1.0.0)
find_package(eosio.cdt)
add_executable( \${PROJ_NAME}.wasm \${ARGN} \${PROJ_NAME} \${PROJ_NAME}.cpp )
`


const generateServiceCppFile = (serviceModel) => {
    var name = serviceModel.name;
    var commandNames = Object.keys(serviceModel.commands);
    var M = (macro) => commandNames.map(commandName => `${macro}(${commandName})`).join('\n');
    var upperName = name.toUpperCase();

    return `#define SVC_NAME ${name}
#include "../dappservices/${name}.hpp"
CONTRACT ${name}service : public eosio::contract {
  using contract::contract;

private:
public:
  
  DAPPSERVICE_PROVIDER_ACTIONS
  ${upperName}_DAPPSERVICE_ACTIONS
  ${M('STANDARD_USAGE_MODEL')}
  
  struct model_t {
    ${M('HANDLE_MODEL_SIGNAL_FIELD')}
  };
  TABLE providermdl {
    model_t model;
    name package_id;
    uint64_t primary_key() const { return package_id.value; }
  };
    
  typedef eosio::multi_index<"providermdl"_n, providermdl> providermodels_t;  

  ACTION xsignal(name service, name action,
                 name provider, name package, std::vector<char> signalRawData) {
    if (current_receiver() != service.value || _self != service) 
      return;
    require_auth(_code);
    ${M('HANDLECASE_SIGNAL_TYPE')}
  }
  DAPPSERVICE_PROVIDER_BASIC_ACTIONS
};

EOSIO_DISPATCH_SVC_PROVIDER(${name}service)\n`;

}

const generateServiceAbiFile = (serviceModel) => {
    const abi = {
        "____comment": "This file was generated with dapp-services-eos. DO NOT EDIT " + new Date().toUTCString(),
        "version": "eosio::abi/1.0",
        "structs": [{
                "name": "model_t",
                "base": "",
                "fields": []
            },
            {
                "name": "providermdl",
                "base": "",
                "fields": [{
                        "name": "model",
                        "type": "model_t"
                    },
                    {
                        "name": "package_id",
                        "type": "name"
                    }
                ]
            },
            {
                "name": "xsignal",
                "base": "",
                "fields": [{
                        "name": "service",
                        "type": "name"
                    },
                    {
                        "name": "action",
                        "type": "name"
                    },
                    {
                        "name": "provider",
                        "type": "name"
                    },
                    {
                        "name": "package",
                        "type": "name"
                    },
                    {
                        "name": "signalRawData",
                        "type": "bytes"
                    }
                ]
            },
            {
                "name": "regprovider",
                "base": "",
                "fields": [{
                        "name": "provider",
                        "type": "name"
                    },
                    {
                        "name": "model",
                        "type": "providermdl"
                    }
                ]
            }
        ],
        "types": [],
        "actions": [{
                "name": "xsignal",
                "type": "xsignal",
                "ricardian_contract": ""
            },
            {
                "name": "regprovider",
                "type": "regprovider",
                "ricardian_contract": ""
            }
        ],
        "tables": [{
            "name": "providermdl",
            "type": "providermdl",
            "index_type": "i64",
            "key_names": [],
            "key_types": []
        }],
        "ricardian_clauses": [],
        "abi_extensions": []
    };
    const structs = abi.structs;
    const model_fields = structs.find(a => a.name == "model_t").fields;

    function addCmd(cmdName) {
        structs.push({
            "name": `${cmdName}_model_t`,
            "base": "",
            "fields": [{
                "name": "cost_per_action",
                "type": "uint64"
            }]
        });
        model_fields.push({
            "name": `${cmdName}_model_field`,
            "type": `${cmdName}_model_t`
        });
    }
    Object.keys(serviceModel.commands).forEach(addCmd);
    return JSON.stringify(abi, null, 2);
}

const generateCommandCodeText = (serviceName, commandName, commandModel, serviceContract) => {

    var fnArgs = (args) => Object.keys(args).map(name => `((${args[name]})(${name}))`).join('');
    var fnPassArgs = (args) => Object.keys(args).join(', ');

    return `SVC_ACTION(${commandName}, ${commandModel.blocking}, ${fnArgs(commandModel.request)},     \
         ${fnArgs(commandModel.signal)}, \
         ${fnArgs(commandModel.callback)},"${serviceContract}"_n) { \
    _${serviceName}_${commandName}(${fnPassArgs(commandModel.callback)}); \
    SEND_SVC_SIGNAL(${commandName}, current_provider, package, ${fnPassArgs(commandModel.signal)})                         \
};`

};

const generateCommandHelperCodeText = (serviceName, commandName, commandModel) => {
    var rargs = commandModel.request;
    var argsKeys = Object.keys(rargs);
    var fnArgsWithType = argsKeys.map(name => `${rargs[name]} ${name}`).join(', ');
    var fnArgs = argsKeys.join(', ');
    return `static void svc_${serviceName}_${commandName}(${fnArgsWithType}) { \
    SEND_SVC_REQUEST(${commandName}, ${fnArgs}) \
};`
}
const generateServiceHppFile = (serviceModel) => {
    var name = serviceModel.name;
    var upperName = name.toUpperCase();
    var commandNames = Object.keys(serviceModel.commands);
    var commandsCodeText = commandNames.map(
        commandName => generateCommandCodeText(name, commandName,
            serviceModel.commands[commandName], getContractAccountFor(serviceModel))).join('\\\n');
    var commandsHelpersCodeText = commandNames.map(
        commandName => generateCommandHelperCodeText(name, commandName,
            serviceModel.commands[commandName], getContractAccountFor(serviceModel))).join('\\\n');

    return `#pragma once
#include "../dappservices/dappservices.hpp"\n
#define SVC_RESP_${upperName}(name) \\
    SVC_RESP_X(${name},name)

#include "../dappservices/_${name}_impl.hpp"\n

#ifdef ${upperName}_DAPPSERVICE_ACTIONS_MORE
#define ${upperName}_DAPPSERVICE_ACTIONS \\
  ${commandsCodeText} \\
  ${commandsHelpersCodeText} \\
  ${upperName}_DAPPSERVICE_ACTIONS_MORE() \n

#else
#define ${upperName}_DAPPSERVICE_ACTIONS \\
  ${commandsCodeText} \\
  ${commandsHelpersCodeText}
#endif



#ifndef ${upperName}_SVC_COMMANDS
#define ${upperName}_SVC_COMMANDS() ${commandNames.map(commandName=>`(x${commandName})`).join('')}\n

struct ${name}_svc_helper{
    ${upperName}_DAPPSERVICE_ACTIONS
};

#endif`;


}

const compileDappService = async(serviceModel) => {
    var name = serviceModel.name;
    var targetFolder = path.resolve(`./contracts/eos/${name}service`);
    if (!fs.existsSync(targetFolder))
        fs.mkdirSync(targetFolder);
    try {
        // generate files
        fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/${name}service.cpp`),
            await generateServiceCppFile(serviceModel));
        fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/${name}service.abi`),
            await generateServiceAbiFile(serviceModel));
        fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/CMakeLists.txt`),
            CMAKELISTS_FILE);

        fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/${name}.hpp`),
            await generateServiceHppFile(serviceModel));
        console.log(emojMap.alembic + `CodeGen Service ${name.green}`)
    }
    catch (e) {
        throw new Error(emojMap.white_frowning_face + `CodeGen Service: ${name.green} Service: ${e}`);
    }
};
const generateConfig = async() => {
    fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/dappservices.config.hpp`),
        `#define DAPPSERVICES_CONTRACT "${dappServicesContract}"_n\n`);
}
module.exports = async(args) => {
    await Promise.all((await loadModels('dapp-services')).map(compileDappService));
    await generateConfig();
}
