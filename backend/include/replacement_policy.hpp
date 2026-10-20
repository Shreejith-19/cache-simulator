#pragma once

#include <vector>
#include <memory>
#include <stdexcept>
#include <limits>
#include "cache_config.hpp"
#include "cache_line.hpp"

namespace cache_sim {

class ReplacementPolicy {
public:
    virtual ~ReplacementPolicy() = default;

    /**
     * Selects which line within a set should be evicted.
     * Precondition: All lines in the set are currently valid.
     * @param lines The cache lines in the target set.
     * @return The 0-based index of the victim line to evict.
     */
    virtual std::size_t selectVictim(const std::vector<CacheLine>& lines) const = 0;

    virtual ReplacementPolicyType getType() const noexcept = 0;
};

class FIFOReplacementPolicy final : public ReplacementPolicy {
public:
    std::size_t selectVictim(const std::vector<CacheLine>& lines) const override {
        if (lines.empty()) {
            throw std::runtime_error("Cannot select victim from an empty set.");
        }
        std::size_t victim_idx = 0;
        uint64_t oldest_insertion = std::numeric_limits<uint64_t>::max();

        for (std::size_t i = 0; i < lines.size(); ++i) {
            if (lines[i].insertion_time < oldest_insertion) {
                oldest_insertion = lines[i].insertion_time;
                victim_idx = i;
            }
        }
        return victim_idx;
    }

    ReplacementPolicyType getType() const noexcept override {
        return ReplacementPolicyType::FIFO;
    }
};

class LRUReplacementPolicy final : public ReplacementPolicy {
public:
    std::size_t selectVictim(const std::vector<CacheLine>& lines) const override {
        if (lines.empty()) {
            throw std::runtime_error("Cannot select victim from an empty set.");
        }
        std::size_t victim_idx = 0;
        uint64_t oldest_access = std::numeric_limits<uint64_t>::max();

        for (std::size_t i = 0; i < lines.size(); ++i) {
            if (lines[i].last_accessed_time < oldest_access) {
                oldest_access = lines[i].last_accessed_time;
                victim_idx = i;
            }
        }
        return victim_idx;
    }

    ReplacementPolicyType getType() const noexcept override {
        return ReplacementPolicyType::LRU;
    }
};

inline std::unique_ptr<ReplacementPolicy> createReplacementPolicy(ReplacementPolicyType type) {
    switch (type) {
        case ReplacementPolicyType::FIFO:
            return std::make_unique<FIFOReplacementPolicy>();
        case ReplacementPolicyType::LRU:
            return std::make_unique<LRUReplacementPolicy>();
    }
    return std::make_unique<LRUReplacementPolicy>();
}

} // namespace cache_sim
