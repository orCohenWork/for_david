#include "../dappservices/ipfs.hpp"

#define DAPPSERVICES_ACTIONS() \
  XSIGNAL_DAPPSERVICE_ACTION \
  IPFS_DAPPSERVICE_ACTIONS
#define DAPPSERVICE_ACTIONS_COMMANDS() \
  IPFS_SVC_COMMANDS() 

#define CONTRACT_NAME() ipfsconsumer 

CONTRACT_START()
  TABLE testentry {  
     uint64_t                      field1;
     std::vector<char>             field2;
     uint64_t                      field3;
  };  
  ACTION testset(testentry data) {
    auto uri = setData(data);
  }
  ACTION testget(std::string uri, uint32_t expectedfield) {
    eosio_assert(getData<testentry>(uri).field1 == expectedfield, "wrong size");
  }
CONTRACT_END((testset)(testget))
