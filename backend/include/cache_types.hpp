#pragma once

#include <string>

namespace cache_sim {
    struct CacheConfig {
        std::size_t cache_size_bytes = 32768; // 32 KB default
        std::size_t block_size_bytes = 64;    // 64 B line
        std::size_t associativity = 4;        // 4-way set associative
        std::string replacement_policy = "LRU";
        std::string write_policy = "write-back";
    };
}
