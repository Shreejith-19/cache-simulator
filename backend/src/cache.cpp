#include "cache.hpp"

namespace cache_sim {

Cache::Cache(const CacheConfig& config)
    : config_(config.normalized()),
      replacement_policy_(createReplacementPolicy(config_.replacement_policy)) {
    // Validate normalized config
    config_.validate();

    std::size_t num_sets = config_.numSets();
    std::size_t assoc = config_.effectiveAssociativity();
    sets_.reserve(num_sets);
    for (std::size_t i = 0; i < num_sets; ++i) {
        sets_.emplace_back(assoc);
    }
}

AddressDecomposition Cache::decompose(uint64_t address) const noexcept {
    AddressDecomposition decomp;
    decomp.raw_address = address;

    const std::size_t offset_bits = config_.offsetBits();
    const std::size_t index_bits = config_.indexBits();

    decomp.block_address = address >> offset_bits;
    decomp.offset = address & config_.offsetMask();
    decomp.set_index = (config_.numSets() > 1) ? (decomp.block_address & config_.indexMask()) : 0;
    decomp.tag = decomp.block_address >> index_bits;

    return decomp;
}

AccessResult Cache::access(uint64_t address) {
    auto decomp = decompose(address);
    auto& set = sets_[decomp.set_index];

    AccessResult result;
    result.address = address;
    result.set_index = decomp.set_index;
    result.tag = decomp.tag;

    // Check for a cache hit
    auto hit_index = set.findLineIndex(decomp.tag);
    if (hit_index.has_value()) {
        result.hit = true;
        result.eviction = false;
        result.line_index = *hit_index;
        result.evicted_tag = 0;

        // If LRU, update access timestamp on hit
        if (config_.replacement_policy == ReplacementPolicyType::LRU) {
            set.getLines()[*hit_index].last_accessed_time = ++access_counter_;
        }

        stats_.recordHit();
        return result;
    }

    // Cache miss: check for an empty (invalid) line slot
    auto empty_index = set.findEmptySlotIndex();
    if (empty_index.has_value()) {
        result.hit = false;
        result.eviction = false;
        result.line_index = *empty_index;
        result.evicted_tag = 0;

        auto& line = set.getLines()[*empty_index];
        line.valid = true;
        line.tag = decomp.tag;
        line.insertion_time = ++access_counter_;
        line.last_accessed_time = access_counter_;

        stats_.recordMiss(false);
        return result;
    }

    // Cache miss and set is full: Eviction occurs
    result.hit = false;
    result.eviction = true;

    // In direct-mapped caches, associativity is 1, so the only line (index 0) is evicted
    std::size_t victim_index = 0;
    if (config_.mapping_strategy != MappingStrategy::DirectMapped) {
        victim_index = replacement_policy_->selectVictim(set.getLines());
    }

    auto& victim_line = set.getLines()[victim_index];
    result.line_index = victim_index;
    result.evicted_tag = victim_line.tag;

    // Replace the victim line with the requested block
    victim_line.tag = decomp.tag;
    victim_line.insertion_time = ++access_counter_;
    victim_line.last_accessed_time = access_counter_;

    stats_.recordMiss(true);
    return result;
}

void Cache::reset() noexcept {
    for (auto& set : sets_) {
        set.reset();
    }
    stats_.reset();
    access_counter_ = 0;
}

} // namespace cache_sim
