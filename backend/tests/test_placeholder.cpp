#include <iostream>
#include <cassert>
#include "cache_types.hpp"

int main() {
    cache_sim::CacheConfig config;
    assert(config.cache_size_bytes == 32768);
    assert(config.block_size_bytes == 64);
    assert(config.associativity == 4);
    std::cout << "All baseline unit tests passed!" << std::endl;
    return 0;
}
