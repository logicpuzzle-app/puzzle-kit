/**
 * Solver Registry
 *
 * Manages solver adapters for different puzzle types
 */

import type { SolverAdapter, SolverRegistry } from './types';

class SolverRegistryImpl implements SolverRegistry {
  private adapters = new Map<string, SolverAdapter>();

  register(adapter: SolverAdapter): void {
    this.adapters.set(adapter.pid, adapter);
  }

  get(pid: string): SolverAdapter | undefined {
    return this.adapters.get(pid);
  }

  getIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  has(pid: string): boolean {
    return this.adapters.has(pid);
  }
}

/**
 * Global solver registry instance
 */
export const solverRegistry = new SolverRegistryImpl();
