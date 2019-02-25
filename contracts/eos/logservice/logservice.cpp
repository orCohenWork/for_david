#define SVC_NAME log
#include "../dappservices/log.hpp"
CONTRACT logservice : public eosio::contract {
  using contract::contract;

private:
public:
  
  DAPPSERVICE_PROVIDER_ACTIONS
  LOG_DAPPSERVICE_ACTIONS
  STANDARD_USAGE_MODEL(logevent)
STANDARD_USAGE_MODEL(logclear)
  
  struct model_t {
    HANDLE_MODEL_SIGNAL_FIELD(logevent)
HANDLE_MODEL_SIGNAL_FIELD(logclear)
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
    HANDLECASE_SIGNAL_TYPE(logevent)
HANDLECASE_SIGNAL_TYPE(logclear)
  }
  DAPPSERVICE_PROVIDER_BASIC_ACTIONS
};

EOSIO_DISPATCH_SVC_PROVIDER(logservice)
