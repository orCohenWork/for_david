var {loadModels} = require('../extensions/tools/models');
const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');

module.exports = async function() {
  var deployments = await loadModels("contract-deployments");
  for (var i = 0; i < deployments.length; i++) {
      var {contract,account} = deployments[i];
      var contractI = artifacts.require(`./${contract}/`);
      var deployedContract = await deployer.deploy(contractI,account);
      console.log(`deployed ${contract} to ${deployedContract.address}`);
  }
};
