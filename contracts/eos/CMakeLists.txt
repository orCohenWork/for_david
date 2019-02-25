cmake_minimum_required(VERSION 3.5)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
add_subdirectory(dappservices)

add_subdirectory(logservice)

add_subdirectory(logconsumer)

add_subdirectory(ipfsservice)

add_subdirectory(ipfsconsumer)

add_subdirectory(coldtoken)
