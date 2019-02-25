#pragma once
#include "../dappservices/dappservices.hpp"

#define SVC_RESP_LOG(name) \
    SVC_RESP_X(log,name)

#include "../dappservices/_log_impl.hpp"


#ifdef LOG_DAPPSERVICE_ACTIONS_MORE
#define LOG_DAPPSERVICE_ACTIONS \
  SVC_ACTION(logevent, false, ((uint64_t)(time))((std::string)(level))((std::string)(filename))((std::string)(line))((std::string)(func))((std::string)(message)),              ((uint64_t)(size)),          ((uint64_t)(size))((std::string)(reciept)),"logservices1"_n) {     _log_logevent(size, reciept);     SEND_SVC_SIGNAL(logevent, current_provider, package, size)                         };\
SVC_ACTION(logclear, false, ((std::string)(level)),              ((uint64_t)(size)),          ((uint64_t)(size))((std::string)(reciept)),"logservices1"_n) {     _log_logclear(size, reciept);     SEND_SVC_SIGNAL(logclear, current_provider, package, size)                         }; \
  static void svc_log_logevent(uint64_t time, std::string level, std::string filename, std::string line, std::string func, std::string message) {     SEND_SVC_REQUEST(logevent, time, level, filename, line, func, message) };\
static void svc_log_logclear(std::string level) {     SEND_SVC_REQUEST(logclear, level) }; \
  LOG_DAPPSERVICE_ACTIONS_MORE() 


#else
#define LOG_DAPPSERVICE_ACTIONS \
  SVC_ACTION(logevent, false, ((uint64_t)(time))((std::string)(level))((std::string)(filename))((std::string)(line))((std::string)(func))((std::string)(message)),              ((uint64_t)(size)),          ((uint64_t)(size))((std::string)(reciept)),"logservices1"_n) {     _log_logevent(size, reciept);     SEND_SVC_SIGNAL(logevent, current_provider, package, size)                         };\
SVC_ACTION(logclear, false, ((std::string)(level)),              ((uint64_t)(size)),          ((uint64_t)(size))((std::string)(reciept)),"logservices1"_n) {     _log_logclear(size, reciept);     SEND_SVC_SIGNAL(logclear, current_provider, package, size)                         }; \
  static void svc_log_logevent(uint64_t time, std::string level, std::string filename, std::string line, std::string func, std::string message) {     SEND_SVC_REQUEST(logevent, time, level, filename, line, func, message) };\
static void svc_log_logclear(std::string level) {     SEND_SVC_REQUEST(logclear, level) };
#endif



#ifndef LOG_SVC_COMMANDS
#define LOG_SVC_COMMANDS() (xlogevent)(xlogclear)


struct log_svc_helper{
    LOG_DAPPSERVICE_ACTIONS
};

#endif