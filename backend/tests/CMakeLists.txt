add_executable(cache_simulator_tests
    cache_engine_tests.cpp
)

target_link_libraries(cache_simulator_tests PRIVATE
    cache_engine
)

enable_testing()
add_test(NAME CacheEngineTests COMMAND cache_simulator_tests)
