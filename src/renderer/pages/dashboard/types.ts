/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Widget Contract for Analytics Dashboard
 * This contract defines the interface that all analytics widgets must implement.
 * Later analytics batches will implement this contract for specific widgets.
 */

/**
 * Base widget state that all widgets must support
 */
export type WidgetState = 'loading' | 'ready' | 'error' | 'empty';

/**
 * Base widget metadata
 */
export interface WidgetMetadata {
  /** Unique identifier for the widget */
  id: string;
  /** Human-readable title */
  title: string;
  /** Widget description */
  description: string;
  /** Widget category for grouping */
  category: string;
  /** Widget version */
  version: string;
  /** Whether widget is enabled */
  enabled: boolean;
}

/**
 * Widget configuration options
 */
export interface WidgetConfig {
  /** Widget-specific configuration */
  [key: string]: unknown;
}

/**
 * Widget data payload
 */
export interface WidgetData<T = unknown> {
  /** The actual data payload */
  data: T;
  /** Timestamp when data was fetched */
  timestamp: number;
  /** Whether data is stale and needs refresh */
  stale: boolean;
}

/**
 * Widget error information
 */
export interface WidgetError {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Original error if available */
  originalError?: Error;
  /** Timestamp when error occurred */
  timestamp: number;
}

/**
 * Base widget interface that all analytics widgets must implement
 */
export interface DashboardWidget<TData = unknown, TConfig extends WidgetConfig = WidgetConfig> {
  /** Widget metadata */
  readonly metadata: WidgetMetadata;

  /** Current widget state */
  readonly state: WidgetState;

  /** Current widget data if available */
  readonly data: WidgetData<TData> | null;

  /** Current error if in error state */
  readonly error: WidgetError | null;

  /** Widget configuration */
  config: TConfig;

  /**
   * Initialize the widget
   */
  initialize(): Promise<void>;

  /**
   * Refresh widget data
   */
  refresh(): Promise<void>;

  /**
   * Update widget configuration
   */
  updateConfig(config: Partial<TConfig>): void;

  /**
   * Clean up widget resources
   */
  dispose(): void;

  /**
   * Subscribe to widget state changes
   */
  onStateChange(callback: (state: WidgetState) => void): () => void;

  /**
   * Subscribe to widget data changes
   */
  onDataChange(callback: (data: WidgetData<TData> | null) => void): () => void;
}

/**
 * Widget factory for creating widget instances
 */
export interface WidgetFactory<TWidget extends DashboardWidget> {
  /** Widget type identifier */
  readonly type: string;

  /** Create a new widget instance */
  create(config?: WidgetConfig): TWidget;

  /** Validate widget configuration */
  validateConfig(config: WidgetConfig): boolean;
}

/**
 * Widget registry for managing available widgets
 */
export interface WidgetRegistry {
  /** Register a widget factory */
  register(factory: WidgetFactory<DashboardWidget>): void;

  /** Unregister a widget factory */
  unregister(type: string): void;

  /** Get a widget factory by type */
  get(type: string): WidgetFactory<DashboardWidget> | undefined;

  /** List all registered widget types */
  list(): string[];

  /** Create a widget instance by type */
  create(type: string, config?: WidgetConfig): DashboardWidget | undefined;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  /** Layout identifier */
  id: string;

  /** Layout name */
  name: string;

  /** Widget positions in the layout */
  widgets: Array<{
    /** Widget instance */
    widget: DashboardWidget;
    /** Grid position (row, column) */
    position: { row: number; col: number };
    /** Grid span (rows, columns) */
    span: { rows: number; cols: number };
  }>;
}

/**
 * Dashboard state
 */
export interface DashboardState {
  /** Current layout */
  layout: DashboardLayout | null;

  /** Dashboard is loading */
  loading: boolean;

  /** Dashboard error if any */
  error: Error | null;

  /** Last refresh timestamp */
  lastRefresh: number | null;
}
