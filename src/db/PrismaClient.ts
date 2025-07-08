import { PrismaClient, Prisma } from '@prisma/client';

type Select<T> = Partial<Record<keyof T, boolean>>;
type Include<T> = Partial<Record<keyof T, boolean>>;
// type OrderByInput = Prisma.SortOrder;

/**
 * PrismaQueryBuilder: A generic query builder for Prisma models.
 * Usage: this.db.findAll('user', req.query, options)
 */
class PrismaQueryBuilder<TModel = any> {
  private query: any;
  private model: any;
  private where: any = {};
  private orderBy: any = {};
  private skip: number = 0;
  private take: number = 10;
  private select: any = undefined;
  private include: any = undefined;

  constructor(model: any, query: any) {
    this.model = model;
    this.query = query;
  }

  /**
   * Enables searching in specified fields.
   * @param fields - Array of field names to search in.
   */
  search(fields: string[]) {
    const searchTerm = this.query.searchTerm || this.query.q;
    if (searchTerm && fields.length) {
      this.where.OR = fields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' }
      }));
    }
    return this;
  }

  /**
   * Adds filtering based on query ?filter[field]=value and enum fields.
   * @param enumFields - Array of enum field names.
   * @param additionalFilters - Any additional filters to apply.
   */
  filter(enumFields: string[], additionalFilters?: any) {
    const exclude = ['searchTerm', 'q', 'sort', 'limit', 'page', 'fields'];
    let filters: any = {};
    // Support ?filter[field]=value syntax
    if (this.query.filter && typeof this.query.filter === 'object') {
      Object.entries(this.query.filter).forEach(([key, value]) => {
        filters[key] = enumFields.includes(key)
          ? { equals: value }
          : { contains: value, mode: 'insensitive' };
      });
    }
    // Also support direct query params (legacy)
    Object.keys(this.query)
      .filter(key => !exclude.includes(key) && key !== 'filter')
      .forEach(key => {
        if (this.query[key] !== undefined) {
          filters[key] = enumFields.includes(key)
            ? { equals: this.query[key] }
            : { contains: this.query[key], mode: 'insensitive' };
        }
      });
    this.where = { ...this.where, ...filters, ...additionalFilters };
    return this;
  }

  /**
   * Sorts the results.
   * @param orderBy - Optional sorting order.
   */
  sort() {
    const sort = this.query.sort;
    if (sort) {
      const [field, order] = sort.split(':');
      this.orderBy = { [field]: order === 'asc' ? 'asc' : 'desc' };
    } else {
      this.orderBy = { createdAt: 'desc' };
    }
    return this;
  }

  /**
   * Paginates the results.
   * @param page - Page number.
   * @param pageSize - Number of items per page.
   */
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    this.skip = (page - 1) * limit;
    this.take = limit;
    return this;
  }

  /**
   * Selects specific fields to return.
   * @param fields - Object specifying which fields to select.
   */
  fields(fields: Select<TModel>) {
    this.select = fields;
    return this;
  }

  /**
   * Includes related models.
   * @param relations - Object specifying which relations to include.
   */
  includeRelations(relations: Include<TModel>) {
    this.include = relations;
    return this;
  }

  /**
   * Executes the query and returns the results.
   */
  async exec(): Promise<{ data: TModel[]; meta: { page: number; limit: number; total: number; totalPage: number } }> {
    const [data, total] = await Promise.all([
      this.model.findMany({
        where: this.where,
        orderBy: this.orderBy,
        skip: this.skip,
        take: this.take,
        select: this.select,
        include: this.include,
      }),
      this.model.count({ where: this.where })
    ]);
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const totalPage = Math.ceil(total / limit);
    return {
      data,
      meta: { page, limit, total, totalPage }
    };
  }
}

// Extend PrismaDB to add a generic findAll method using PrismaQueryBuilder
export class PrismaDB {
  public client: PrismaClient;

  constructor() {
    this.client = new PrismaClient();
  }

  /**
   * Generic findAll method for any model.
   * @param modelName - The Prisma model name as a string (e.g., 'user')
   * @param query - The query object (e.g., req.query)
   * @param options - Optional: { searchableFields, enumFields, include, select, additionalFilters }
   */
  findAll<TModel = any>(
    modelName: keyof PrismaClient,
    query: Record<string, any>,
    options?: {
      searchableFields?: string[];
      enumFields?: string[];
      include?: any;
      select?: any;
      additionalFilters?: any;
    }
  ): PrismaQueryBuilder<TModel> {
    const prismaDelegate = (this.client[modelName] as any);
    const builder = new PrismaQueryBuilder<TModel>(
      {
        findMany: prismaDelegate.findMany.bind(prismaDelegate),
        count: prismaDelegate.count.bind(prismaDelegate),
      },
      query
    );
    if (options?.searchableFields) builder.search(options.searchableFields);
    if (options?.enumFields) builder.filter(options.enumFields, options.additionalFilters);
    else builder.filter([], options?.additionalFilters);
    builder.sort();
    builder.paginate();
    if (options?.select) builder.fields(options.select);
    if (options?.include) builder.includeRelations(options.include);
    return builder;
  }
}
