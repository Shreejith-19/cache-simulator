#pragma once

#include <cstdint>
#include <cstddef>

namespace cache_sim {

struct SimulationStats {
    uint64_t total_accesses = 0;
    uint64_t hits = 0;
    uint64_t misses = 0;
    uint64_t evictions = 0;

    double hit_rate() const noexcept {
        return total_accesses > 0 ? (static_cast<double>(hits) / static_cast<double>(total_accesses)) : 0.0;
    }

    double miss_rate() const noexcept {
        return total_accesses > 0 ? (static_cast<double>(misses) / static_cast<double>(total_accesses)) : 0.0;
    }

    void recordHit() noexcept {
        ++total_accesses;
        ++hits;
    }

    void recordMiss(bool evicted) noexcept {
        ++total_accesses;
        ++misses;
        if (evicted) {
            ++evictions;
        }
    }

    void reset() noexcept {
        total_accesses = 0;
        hits = 0;
        misses = 0;
        evictions = 0;
    }
};

} // namespace cache_sim
