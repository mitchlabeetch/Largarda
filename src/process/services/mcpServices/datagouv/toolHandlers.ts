/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * data.gouv.fr MCP Tool Handlers
 * Implements tool handlers for data.gouv.fr API operations.
 */

import { getDatagouvClient } from '@process/services/data/datagouvClient';

/**
 * Tool handler function type
 */
export type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

/**
 * Tool handler for searching datasets
 */
export const searchDatasetsHandler: ToolHandler = async (_params) => {
  const args = _params as {
    q?: string;
    filters?: Record<string, unknown>;
    sort?: string;
    page_size?: number;
  };

  const client = getDatagouvClient();
  const result = await client.searchDatasets({
    q: args.q,
    filters: args.filters,
    sort: args.sort,
    page: 1,
    pageSize: args.page_size ?? 20,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for getting a dataset by ID or slug
 */
export const getDatasetHandler: ToolHandler = async (_params) => {
  const args = _params as { id_or_slug: string };

  const client = getDatagouvClient();
  const result = await client.getDataset(args.id_or_slug);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for listing dataset resources
 */
export const listDatasetResourcesHandler: ToolHandler = async (_params) => {
  const args = _params as { id_or_slug: string };

  const client = getDatagouvClient();
  const result = await client.listDatasetResources(args.id_or_slug);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for querying tabular data
 */
export const queryTabularHandler: ToolHandler = async (_params) => {
  const args = _params as {
    rid: string;
    filters?: Record<string, unknown>;
    order_by?: string;
    page_size?: number;
  };

  const client = getDatagouvClient();
  const result = await client.queryTabular({
    rid: args.rid,
    filters: args.filters,
    orderBy: args.order_by,
    pageSize: args.page_size ?? 100,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for getting metrics
 */
export const getMetricsHandler: ToolHandler = async (_params) => {
  const args = _params as {
    model: string;
    filters?: Record<string, unknown>;
  };

  const client = getDatagouvClient();
  const result = await client.getMetrics({
    model: args.model,
    filters: args.filters,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for searching dataservices (APIs)
 */
export const searchDataservicesHandler: ToolHandler = async (_params) => {
  const args = _params as {
    q?: string;
    filters?: Record<string, unknown>;
    page_size?: number;
  };

  const client = getDatagouvClient();
  const result = await client.searchDataservices({
    q: args.q,
    filters: args.filters,
    page: 1,
    pageSize: args.page_size ?? 20,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool handler for getting a dataservice by ID
 */
export const getDataserviceHandler: ToolHandler = async (_params) => {
  const args = _params as { id: string };

  const client = getDatagouvClient();
  const result = await client.getDataservice(args.id);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
};

/**
 * Tool definitions for data.gouv.fr MCP server
 */
export const datagouvToolDefinitions = [
  {
    name: 'datagouv_search_datasets',
    description: 'Search for datasets on data.gouv.fr',
    inputSchema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query string',
        },
        filters: {
          type: 'object',
          description: 'Filter criteria (e.g., spatial, temporal, license)',
        },
        sort: {
          type: 'string',
          description: 'Sort field (e.g., -created, reuses, followers)',
        },
        page_size: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
      },
    },
  },
  {
    name: 'datagouv_get_dataset',
    description: 'Get a specific dataset by ID or slug',
    inputSchema: {
      type: 'object',
      properties: {
        id_or_slug: {
          type: 'string',
          description: 'Dataset ID or slug',
        },
      },
      required: ['id_or_slug'],
    },
  },
  {
    name: 'datagouv_list_dataset_resources',
    description: 'List all resources (files) for a dataset',
    inputSchema: {
      type: 'object',
      properties: {
        id_or_slug: {
          type: 'string',
          description: 'Dataset ID or slug',
        },
      },
      required: ['id_or_slug'],
    },
  },
  {
    name: 'datagouv_query_tabular',
    description: 'Query tabular data using the Tabular API',
    inputSchema: {
      type: 'object',
      properties: {
        rid: {
          type: 'string',
          description: 'Resource ID of the tabular dataset',
        },
        filters: {
          type: 'object',
          description: 'Filter criteria for the query',
        },
        order_by: {
          type: 'string',
          description: 'Field to order results by',
        },
        page_size: {
          type: 'number',
          description: 'Number of results per page (default: 100)',
        },
      },
      required: ['rid'],
    },
  },
  {
    name: 'datagouv_get_metrics',
    description: 'Get metrics for a specific model (e.g., dataset, organization)',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model type (e.g., dataset, organization, reuse)',
        },
        filters: {
          type: 'object',
          description: 'Filter criteria for metrics',
        },
      },
      required: ['model'],
    },
  },
  {
    name: 'datagouv_search_dataservices',
    description: 'Search for dataservices (APIs) on data.gouv.fr',
    inputSchema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query string',
        },
        filters: {
          type: 'object',
          description: 'Filter criteria',
        },
        page_size: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
      },
    },
  },
  {
    name: 'datagouv_get_dataservice',
    description: 'Get a specific dataservice by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Dataservice ID',
        },
      },
      required: ['id'],
    },
  },
];

/**
 * Map tool names to their handlers
 */
export const datagouvToolHandlers: Record<string, ToolHandler> = {
  datagouv_search_datasets: searchDatasetsHandler,
  datagouv_get_dataset: getDatasetHandler,
  datagouv_list_dataset_resources: listDatasetResourcesHandler,
  datagouv_query_tabular: queryTabularHandler,
  datagouv_get_metrics: getMetricsHandler,
  datagouv_search_dataservices: searchDataservicesHandler,
  datagouv_get_dataservice: getDataserviceHandler,
};
