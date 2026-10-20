#pragma once

#include <vector>
#include <optional>
#include "cache_line.hpp"

namespace cache_sim {

class CacheSet {
public:
    explicit CacheSet(std::size_t associativity = 1)
        : lines_(associativity) {}

    std::optional<std::size_t> findLineIndex(uint64_t tag) const noexcept {
        for (std::size_t i = 0; i < lines_.size(); ++i) {
            if (lines_[i].valid && lines_[i].tag == tag) {
                return i;
            }
        }
        return std::nullopt;
    }

    std::optional<std::size_t> findEmptySlotIndex() const noexcept {
        for (std::size_t i = 0; i < lines_.size(); ++i) {
            if (!lines_[i].valid) {
                return i;
            }
        }
        return std::nullopt;
    }

    std::size_t getAssociativity() const noexcept {
        return lines_.size();
    }

    const std::vector<CacheLine>& getLines() const noexcept {
        return lines_;
    }

    std::vector<CacheLine>& getLines() noexcept {
        return lines_;
    }

    void reset() noexcept {
        for (auto& line : lines_) {
            line.reset();
        }
    }

private:
    std::vector<CacheLine> lines_;
};

} // namespace cache_sim
