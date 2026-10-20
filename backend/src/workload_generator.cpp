#include "workload_generator.hpp"
#include <random>
#include <algorithm>

namespace cache_sim {

std::vector<uint64_t> WorkloadGenerator::generate(const WorkloadConfig& config) {
    if (config.type == WorkloadType::Sequential) {
        return generateSequential(config.access_count, config.start_address, 4);
    } else {
        return generateRandom(config.access_count, config.seed, config.address_space_size);
    }
}

std::vector<uint64_t> WorkloadGenerator::generateSequential(
    std::size_t count,
    uint64_t start_address,
    uint64_t stride) {
    std::vector<uint64_t> trace;
    trace.reserve(count);

    // Ensure start address is aligned to 4 bytes
    uint64_t current = start_address & ~0x3ULL;
    // Ensure stride is a multiple of 4
    uint64_t aligned_stride = (stride == 0) ? 4 : (stride & ~0x3ULL);
    if (aligned_stride == 0) aligned_stride = 4;

    for (std::size_t i = 0; i < count; ++i) {
        trace.push_back(current);
        current += aligned_stride;
    }
    return trace;
}

std::vector<uint64_t> WorkloadGenerator::generateRandom(
    std::size_t count,
    uint64_t seed,
    uint64_t address_space_size) {
    std::vector<uint64_t> trace;
    trace.reserve(count);

    if (address_space_size < 4) {
        address_space_size = 4;
    }

    uint64_t max_words = address_space_size / 4;
    if (max_words == 0) max_words = 1;

    std::mt19937_64 rng(seed);
    std::uniform_int_distribution<uint64_t> dist(0, max_words - 1);

    for (std::size_t i = 0; i < count; ++i) {
        uint64_t word_index = dist(rng);
        trace.push_back(word_index * 4); // Always aligned to 4 bytes
    }

    return trace;
}

} // namespace cache_sim
