const fs = require('fs');
const {execPromise, emojMap} = require('../../helpers/_exec');
var tidyChecks = ["*"];
var path = require('path');
var CMakeLists = `get_filename_component(PROJ_NAME "\${CMAKE_CURRENT_SOURCE_DIR}" NAME )
cmake_minimum_required(VERSION 3.5)
project(\${PROJ_NAME} VERSION 1.0.0)
find_package(eosio.cdt)
add_contract( \${PROJ_NAME} \${PROJ_NAME} \${PROJ_NAME}.cpp )
`
module.exports = async(args,zeusbox)=>{
    if(zeusbox.install && zeusbox.install.contracts){
        await Promise.all(Object.keys(zeusbox.install.contracts).map(async contract=>{
            console.log( emojMap.eight_spoked_asterisk + `Configuring ${contract.green}`);
            
            var fileName =  './contracts/eos/CMakeLists.txt';
            var cmakelists ="";
            if(fs.existsSync(fileName))
                cmakelists = fs.readFileSync(fileName).toString();
            cmakelists += `\nadd_subdirectory(${contract})\n`
            fs.writeFileSync(fileName,cmakelists);
            var contractDir = path.join('./contracts/eos/', contract);
            var contractMakeFile = path.join(contractDir, 'CMakeLists.txt');
            if(fs.existsSync(contractDir) && !fs.existsSync(contractMakeFile))
                fs.writeFileSync(contractMakeFile, CMakeLists);
        }));
    }
}