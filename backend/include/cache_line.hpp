#pragma once

#include <cstdint>

namespace cache_sim {

struct CacheLine {
    bool valid = false;
    uint64_t tag = 0;
    uint64_t insertion_time = 0;      // Monotonic timestamp when line was brought into cache (FIFO)
    uint64_t last_accessed_time = 0;  // Monotonic timestamp when line was last read/written (LRU)

    void reset() noexcept {
        valid = false;
        tag = 0;
        insertion_time = 0;
        last_accessed_time = 0;
    }
};

} // namespace cache_sim
