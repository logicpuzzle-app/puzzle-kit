/**
 * Puzzle Export Format Version
 *
 * Version history:
 * - 1.0.0: Initial format with full layer fields in elements
 * - 1.1.0: Optimized format - layer fields stripped (inferred from problem/answer structure)
 * - 1.2.0: Optional topology snapshot preserves native board IDs and connections
 * - 1.3.0: Vertex shading notes; retain their graph in legacy grid rendering too
 * - 1.4.0: Retained merge source graph and explicit merged-cell identities
 * - 1.5.0: Flat retained source and explicit mixed merge/split operations
 * - 1.6.0: Verified legacy split boundary refinements and diagonal orientation
 *
 * Versioning policy:
 * - Major version: Breaking changes, no backward compatibility
 * - Minor version: New features with backward compatibility
 * - Patch version: Bug fixes
 */

export const PUZZLE_EXPORT_VERSION = '1.6.0';
