import { useCallback, useState, useMemo } from 'react';
import { useDataverseAsync } from './useDataverseAsync';
import type { IOperationResult } from '@microsoft/power-apps/data';

export interface DataverseService<T, TBase = T> {
  create(record: any): Promise<IOperationResult<T>>;
  update(id: string, changedFields: any): Promise<IOperationResult<T>>;
  delete(id: string): Promise<void>;
  get(id: string, options?: any): Promise<IOperationResult<T>>;
  getAll(options?: any): Promise<IOperationResult<T[]>>;
}

/**
 * Standardized hook for CRUD operations on Dataverse entities.
 * Handles state for listing, creating, updating, and deleting.
 */
export function useDataverseCrud<T, TBase = T>(service: DataverseService<T, TBase>) {
  const listState = useDataverseAsync<T[]>();
  const [items, setItems] = useState<T[]>([]);

  // Deconstruct stable functions from listState to use as dependencies
  const { execute: executeList } = listState;

  const fetchAll = useCallback(async (options?: any) => {
    const result = await executeList(service.getAll(options));
    if (result.success && result.data) {
      setItems(result.data);
    }
    return result;
  }, [executeList, service]);

  const create = useCallback(async (record: any) => {
    const result = await service.create(record);
    if (result.success && result.data) {
      setItems(prev => [result.data!, ...prev]);
    }
    return result;
  }, [service]);

  const update = useCallback(async (id: string, changedFields: any) => {
    const result = await service.update(id, changedFields);
    if (result.success && result.data) {
      setItems(prev => prev.map(item => {
        const itemAny = item as any;
        const idKey = Object.keys(itemAny).find(k => k.endsWith('id')) || 'id';
        return itemAny[idKey] === id ? result.data : item;
      }) as T[]);
    }
    return result;
  }, [service]);

  const remove = useCallback(async (id: string) => {
    try {
      await service.delete(id);
      setItems(prev => prev.filter(item => {
        const itemAny = item as any;
        const idKey = Object.keys(itemAny).find(k => k.endsWith('id')) || 'id';
        return itemAny[idKey] !== id;
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [service]);

  return useMemo(() => ({
    items,
    setItems,
    loading: listState.loading,
    error: listState.error,
    fetchAll,
    create,
    update,
    remove,
    refresh: fetchAll
  }), [items, listState.loading, listState.error, fetchAll, create, update, remove]);
}
