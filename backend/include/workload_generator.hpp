#pragma once

#include <vector>
#include <cstdint>
#include <cstddef>
#include <string>

namespace cache_sim {

enum class WorkloadType {
    Sequential,
    Random
};

inline std::string to_string(WorkloadType type) {
    switch (type) {
        case WorkloadType::Sequential: return "Sequential";
        case WorkloadType::Random: return "Random";
    }
    return "Unknown";
}

struct WorkloadConfig {
    WorkloadType type = WorkloadType::Sequential;
    std::size_t access_count = 1000;           // Supported 100 to 10,000+
    uint64_t start_address = 0;               // Start byte address (aligned to 4)
    uint64_t address_space_size = 65536;      // Memory range for random accesses (default 64 KiB)
    uint64_t seed = 42;                       // Seed for reproducible random sequences
};

class WorkloadGenerator {
public:
    /**
     * Generates a workload trace according to the specified configuration.
     * Guaranteed to produce strictly 4-byte aligned memory addresses.
     */
    static std::vector<uint64_t> generate(const WorkloadConfig& config);

    /**
     * Generates sequential 4-byte aligned memory addresses:
     * start_address, start_address + 4, start_address + 8, ...
     */
    static std::vector<uint64_t> generateSequential(
        std::size_t count,
        uint64_t start_address = 0,
        uint64_t stride = 4);

    /**
     * Generates reproducible, pseudo-random 4-byte aligned memory addresses
     * within [0, address_space_size) using std::mt19937_64.
     */
    static std::vector<uint64_t> generateRandom(
        std::size_t count,
        uint64_t seed = 42,
        uint64_t address_space_size = 65536);
};

} // namespace cache_sim
