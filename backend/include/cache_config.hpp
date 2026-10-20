#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <stdexcept>
#include <cmath>

namespace cache_sim {

enum class MappingStrategy {
    DirectMapped,
    SetAssociative,
    FullyAssociative
};

inline std::string to_string(MappingStrategy strategy) {
    switch (strategy) {
        case MappingStrategy::DirectMapped: return "DirectMapped";
        case MappingStrategy::SetAssociative: return "SetAssociative";
        case MappingStrategy::FullyAssociative: return "FullyAssociative";
    }
    return "Unknown";
}

enum class ReplacementPolicyType {
    FIFO,
    LRU
};

inline std::string to_string(ReplacementPolicyType policy) {
    switch (policy) {
        case ReplacementPolicyType::FIFO: return "FIFO";
        case ReplacementPolicyType::LRU: return "LRU";
    }
    return "Unknown";
}

struct CacheConfig {
    std::size_t capacity_bytes = 4096;        // e.g. 1024, 2048, 4096, 8192, 16384, 32768
    std::size_t line_size_bytes = 64;          // 16, 32, 64, 128
    MappingStrategy mapping_strategy = MappingStrategy::SetAssociative;
    std::size_t associativity = 4;             // 1 for DirectMapped, 2, 4, 8 for SetAssociative, derived for FullyAssociative
    ReplacementPolicyType replacement_policy = ReplacementPolicyType::LRU;

    static constexpr bool isPowerOfTwo(std::size_t n) noexcept {
        return n > 0 && (n & (n - 1)) == 0;
    }

    static constexpr std::size_t log2Int(std::size_t n) noexcept {
        std::size_t count = 0;
        while (n > 1) {
            n >>= 1;
            ++count;
        }
        return count;
    }

    // Resolves and normalizes configuration (e.g. derives associativity for fully associative)
    CacheConfig normalized() const {
        CacheConfig copy = *this;
        if (copy.mapping_strategy == MappingStrategy::DirectMapped) {
            copy.associativity = 1;
        } else if (copy.mapping_strategy == MappingStrategy::FullyAssociative) {
            if (copy.line_size_bytes > 0) {
                copy.associativity = copy.capacity_bytes / copy.line_size_bytes;
            }
        }
        return copy;
    }

    bool isValid() const noexcept {
        if (!isPowerOfTwo(capacity_bytes) || capacity_bytes < 1024) {
            return false;
        }
        if (line_size_bytes != 16 && line_size_bytes != 32 && line_size_bytes != 64 && line_size_bytes != 128) {
            return false;
        }
        if (capacity_bytes < line_size_bytes) {
            return false;
        }

        if (mapping_strategy == MappingStrategy::DirectMapped) {
            // Direct mapped must have associativity 1
            if (associativity != 1) return false;
        } else if (mapping_strategy == MappingStrategy::SetAssociative) {
            if (!isPowerOfTwo(associativity) || associativity < 2) {
                return false;
            }
            if (capacity_bytes < line_size_bytes * associativity) {
                return false;
            }
        } else if (mapping_strategy == MappingStrategy::FullyAssociative) {
            // Derived associativity: capacity_bytes / line_size_bytes
            std::size_t expected_assoc = capacity_bytes / line_size_bytes;
            if (associativity != 0 && associativity != expected_assoc) {
                // If set, must match capacity / line_size
                return false;
            }
        }

        std::size_t sets = numSets();
        if (sets == 0 || !isPowerOfTwo(sets)) {
            return false;
        }

        return true;
    }

    void validate() const {
        if (!isPowerOfTwo(capacity_bytes)) {
            throw std::invalid_argument("Cache capacity must be a power of two (got " + std::to_string(capacity_bytes) + " bytes).");
        }
        if (capacity_bytes < 1024) {
            throw std::invalid_argument("Cache capacity must be at least 1 KiB (1024 bytes), got " + std::to_string(capacity_bytes) + " bytes.");
        }
        if (line_size_bytes != 16 && line_size_bytes != 32 && line_size_bytes != 64 && line_size_bytes != 128) {
            throw std::invalid_argument("Cache line size must be 16, 32, 64, or 128 bytes (got " + std::to_string(line_size_bytes) + " bytes).");
        }
        if (capacity_bytes < line_size_bytes) {
            throw std::invalid_argument("Cache capacity cannot be smaller than line size.");
        }

        if (mapping_strategy == MappingStrategy::SetAssociative) {
            if (!isPowerOfTwo(associativity) || associativity < 2) {
                throw std::invalid_argument("Set-associative cache associativity must be a power of two >= 2 (got " + std::to_string(associativity) + ").");
            }
            if (capacity_bytes < line_size_bytes * associativity) {
                throw std::invalid_argument("Capacity must be at least line size * associativity.");
            }
        }

        std::size_t sets = numSets();
        if (sets == 0 || !isPowerOfTwo(sets)) {
            throw std::invalid_argument("Number of sets must be a non-zero power of two.");
        }
    }

    std::size_t effectiveAssociativity() const noexcept {
        if (mapping_strategy == MappingStrategy::DirectMapped) {
            return 1;
        }
        if (mapping_strategy == MappingStrategy::FullyAssociative) {
            return line_size_bytes > 0 ? (capacity_bytes / line_size_bytes) : 1;
        }
        return associativity;
    }

    std::size_t numSets() const noexcept {
        if (mapping_strategy == MappingStrategy::FullyAssociative) {
            return 1;
        }
        std::size_t assoc = effectiveAssociativity();
        std::size_t bytes_per_set = line_size_bytes * assoc;
        if (bytes_per_set == 0) return 0;
        return capacity_bytes / bytes_per_set;
    }

    std::size_t totalLines() const noexcept {
        if (line_size_bytes == 0) return 0;
        return capacity_bytes / line_size_bytes;
    }

    std::size_t offsetBits() const noexcept {
        return log2Int(line_size_bytes);
    }

    std::size_t indexBits() const noexcept {
        std::size_t sets = numSets();
        return (sets > 1) ? log2Int(sets) : 0;
    }

    std::size_t tagBits() const noexcept {
        return 64 - offsetBits() - indexBits();
    }

    uint64_t offsetMask() const noexcept {
        return (line_size_bytes > 0) ? (static_cast<uint64_t>(line_size_bytes) - 1) : 0;
    }

    uint64_t indexMask() const noexcept {
        std::size_t sets = numSets();
        return (sets > 0) ? (static_cast<uint64_t>(sets) - 1) : 0;
    }
};

} // namespace cache_sim
