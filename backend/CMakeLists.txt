cmake_minimum_required(VERSION 3.20)
project(CacheSimulatorBackend VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# MSVC specific flags to ensure clean standard compliance
if (MSVC)
    add_compile_options(/permissive- /utf-8 /EHsc)
endif()

include(FetchContent)

# Fetch standalone Asio for Crow
FetchContent_Declare(
    asio
    GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
    GIT_TAG asio-1-30-2
)
FetchContent_GetProperties(asio)
if(NOT asio_POPULATED)
    FetchContent_Populate(asio)
    set(ASIO_INCLUDE_DIR "${asio_SOURCE_DIR}/asio/include" CACHE PATH "Path to Asio headers" FORCE)
    list(APPEND CMAKE_PREFIX_PATH "${asio_SOURCE_DIR}/asio")
    list(APPEND CMAKE_INCLUDE_PATH "${asio_SOURCE_DIR}/asio/include")
endif()

# Crow configuration options
set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "Build Crow examples" FORCE)
set(CROW_BUILD_TESTS OFF CACHE BOOL "Build Crow tests" FORCE)
set(CROW_INSTALL OFF CACHE BOOL "Install Crow" FORCE)

FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.0
)
FetchContent_MakeAvailable(Crow)

# Cache Simulation Engine Static Library
add_library(cache_engine STATIC
    src/cache.cpp
    src/workload_generator.cpp
)

target_include_directories(cache_engine PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Main backend server executable
add_executable(cache_simulator_backend
    src/main.cpp
)

target_link_libraries(cache_simulator_backend PRIVATE
    cache_engine
    Crow::Crow
)

if (WIN32)
    target_link_libraries(cache_simulator_backend PRIVATE ws2_32 mswsock)
endif()

# Unit tests
enable_testing()
add_subdirectory(tests)
