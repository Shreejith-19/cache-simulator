add_executable(cache_simulator_tests
    cache_engine_tests.cpp
)

target_link_libraries(cache_simulator_tests PRIVATE
    cache_engine
)

add_executable(api_integration_tests
    api_integration_tests.cpp
)

target_link_libraries(api_integration_tests PRIVATE
    cache_engine
    Crow::Crow
)

if (WIN32)
    target_link_libraries(api_integration_tests PRIVATE ws2_32 mswsock)
endif()

enable_testing()
add_test(NAME CacheEngineTests COMMAND cache_simulator_tests)
add_test(NAME ApiIntegrationTests COMMAND api_integration_tests)
