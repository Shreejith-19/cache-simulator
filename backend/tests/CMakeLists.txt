add_executable(cache_simulator_tests
    test_placeholder.cpp
)

target_include_directories(cache_simulator_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../include
)

enable_testing()
add_test(NAME BaselineTests COMMAND cache_simulator_tests)
