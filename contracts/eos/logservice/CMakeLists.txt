
get_filename_component(PROJ_NAME "${CMAKE_CURRENT_SOURCE_DIR}" NAME )
cmake_minimum_required(VERSION 3.5)
project(${PROJ_NAME} VERSION 1.0.0)
find_package(eosio.cdt)
add_executable( ${PROJ_NAME}.wasm ${ARGN} ${PROJ_NAME} ${PROJ_NAME}.cpp )
