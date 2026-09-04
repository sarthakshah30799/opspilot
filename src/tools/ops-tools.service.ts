import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DataPackService } from '../data-pack/data-pack.service.js';

const TenantServiceSchema = z.object({
  tenantId: z.string().min(1),
  service: z.string().min(1),
});

export type ToolCallResult = {
  name: string;
  status: 'success' | 'error' | 'timeout';
  data?: unknown;
  error?: string;
};

@Injectable()
export class OpsToolsService {
  constructor(private readonly dataPack: DataPackService) {}

  createTools(boundTenantId: string) {
    const getServiceHealth = tool(
      async (input) => {
        const result = await this.getServiceHealth(
          boundTenantId,
          input.tenantId,
          input.service,
        );
        return JSON.stringify(result);
      },
      {
        name: 'get_service_health',
        description:
          'Return current health signals for a tenant and service from fixture data.',
        schema: TenantServiceSchema,
      },
    );

    const getRecentDeployments = tool(
      async (input) => {
        const result = await this.getRecentDeployments(
          boundTenantId,
          input.tenantId,
          input.service,
        );
        return JSON.stringify(result);
      },
      {
        name: 'get_recent_deployments',
        description:
          'Return recent deployments for a tenant and service from fixture data.',
        schema: TenantServiceSchema,
      },
    );

    return { getServiceHealth, getRecentDeployments };
  }

  async getServiceHealth(
    boundTenantId: string,
    requestedTenantId: string,
    service: string,
  ): Promise<ToolCallResult> {
    if (requestedTenantId !== boundTenantId) {
      return {
        name: 'get_service_health',
        status: 'error',
        error: 'tenant_mismatch',
      };
    }
    try {
      this.dataPack.assertTenant(boundTenantId);
      const record = this.dataPack.getServiceHealth(boundTenantId, service);
      if (!record) {
        return {
          name: 'get_service_health',
          status: 'error',
          error: `No health data for service ${service}`,
        };
      }
      return { name: 'get_service_health', status: 'success', data: record };
    } catch (err) {
      return {
        name: 'get_service_health',
        status: 'error',
        error: err instanceof Error ? err.message : 'unknown_error',
      };
    }
  }

  async getRecentDeployments(
    boundTenantId: string,
    requestedTenantId: string,
    service: string,
  ): Promise<ToolCallResult> {
    if (requestedTenantId !== boundTenantId) {
      return {
        name: 'get_recent_deployments',
        status: 'error',
        error: 'tenant_mismatch',
      };
    }
    try {
      this.dataPack.assertTenant(boundTenantId);
      const records = this.dataPack.getRecentDeployments(
        boundTenantId,
        service,
      );
      if (records.length === 0) {
        return {
          name: 'get_recent_deployments',
          status: 'error',
          error: `No deployment data for service ${service}`,
        };
      }
      return {
        name: 'get_recent_deployments',
        status: 'success',
        data: records.slice(0, 5),
      };
    } catch (err) {
      return {
        name: 'get_recent_deployments',
        status: 'error',
        error: err instanceof Error ? err.message : 'unknown_error',
      };
    }
  }

  /**
   * Deterministic tool selection: call health/deploy tools when the message
   * suggests deployment, errors, rollback, or health — never call every tool blindly.
   */
  shouldCallTelemetryTools(message: string, service: string): boolean {
    const text = `${message} ${service}`.toLowerCase();
    const keywords = [
      'deploy',
      'rollback',
      'error',
      '502',
      '503',
      'latency',
      'degraded',
      'outage',
      'fail',
      'health',
      'checkout',
      'payments',
    ];
    return keywords.some((k) => text.includes(k));
  }
}
